package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/email"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/notify"
	"nile-connect/lib/pipeline"
	"nile-connect/lib/respond"

	"gorm.io/gorm"
)

// Handler is the single entrypoint for all /api/employer/* routes.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	// Require that an employer profile exists for this user (any status).
	// Newly-SSO'd employers start with status='pending' and must be able to
	// view/update their own profile before it is approved by staff.
	var empProfile models.EmployerProfile
	if err := database.Where("user_id = ? AND deleted_at IS NULL", auth.UserID).First(&empProfile).Error; err != nil {
		respond.Error(w, http.StatusForbidden, "employer profile not found — contact support")
		return
	}

	switch r.URL.Query().Get("path") {
	case "profile":
		employerProfile(w, r, auth)
	case "jobs":
		employerJobs(w, r, auth)
	case "job-detail":
		employerJobDetail(w, r, auth, database)
	case "applications":
		employerApplications(w, r, auth, database)
	case "application-detail":
		employerApplicationDetail(w, r, auth, database)
	case "application-stage":
		employerApplicationStage(w, r, auth, database)
	case "application-notes":
		employerApplicationNotes(w, r, auth, database)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── profile ───────────────────────────────────────────────────────────────────

type profileResp struct {
	ID           string `json:"id"`
	UserID       string `json:"user_id"`
	CompanyName  string `json:"company_name"`
	Industry     string `json:"industry"`
	Location     string `json:"location"`
	About        string `json:"about"`
	ContactEmail string `json:"contact_email"`
	Website      string `json:"website"`
	LinkedIn     string `json:"linkedin"`
	Status       string `json:"status"`
	LogoURL      string `json:"logo_url"`
	CompanySize  string `json:"company_size"`
	Headquarters string `json:"headquarters"`
	IsVerified   bool   `json:"is_verified"`
	FoundedYear  int    `json:"founded_year"`
}

func toProfileResp(p *models.EmployerProfile) profileResp {
	return profileResp{
		ID: p.ID, UserID: p.UserID, CompanyName: p.CompanyName,
		Industry: p.Industry, Location: p.Location, About: p.About,
		ContactEmail: p.ContactEmail, Website: p.Website, LinkedIn: p.LinkedIn, Status: p.Status,
		LogoURL: p.LogoURL, CompanySize: p.CompanySize, Headquarters: p.Headquarters,
		IsVerified: p.IsVerified, FoundedYear: p.FoundedYear,
	}
}

func employerProfile(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var profile models.EmployerProfile
		if err := database.Where("user_id = ? AND deleted_at IS NULL", auth.UserID).First(&profile).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "employer profile not found")
			return
		}
		respond.OK(w, toProfileResp(&profile))

	case http.MethodPut:
		var req struct {
			CompanyName  string `json:"company_name"`
			Industry     string `json:"industry"`
			Location     string `json:"location"`
			About        string `json:"about"`
			ContactEmail string `json:"contact_email"`
			Website      string `json:"website"`
			LinkedIn     string `json:"linkedin"`
			LogoURL      string `json:"logo_url"`
			CompanySize  string `json:"company_size"`
			Headquarters string `json:"headquarters"`
			FoundedYear  int    `json:"founded_year"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		database.Model(&models.EmployerProfile{}).Where("user_id = ?", auth.UserID).Updates(map[string]any{
			"company_name": req.CompanyName, "industry": req.Industry, "location": req.Location,
			"about": req.About, "contact_email": req.ContactEmail, "website": req.Website, "linkedin": req.LinkedIn,
			"logo_url": req.LogoURL, "company_size": req.CompanySize, "headquarters": req.Headquarters,
			"founded_year": req.FoundedYear,
		})
		var profile models.EmployerProfile
		database.Where("user_id = ?", auth.UserID).First(&profile)
		respond.OK(w, toProfileResp(&profile))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── jobs ──────────────────────────────────────────────────────────────────────

type jobResp struct {
	ID                 string    `json:"id"`
	EmployerID         string    `json:"employer_id"`
	Title              string    `json:"title"`
	Type               string    `json:"type"`
	EmploymentCategory string    `json:"employment_category"`
	IsRemote           bool      `json:"is_remote"`
	Location           string    `json:"location"`
	Salary             string    `json:"salary"`
	Description        string    `json:"description"`
	Requirements       string    `json:"requirements"`
	Skills             string    `json:"skills"`
	RequiredDocs       []string  `json:"required_docs"`
	OptionalDocs       []string  `json:"optional_docs"`
	Deadline           time.Time `json:"deadline"`
	Status             string    `json:"status"`
	RejectionReason    string    `json:"rejection_reason,omitempty"`
	ApplicantCount     int       `json:"applicant_count"`
	PostedAt           time.Time `json:"posted_at"`
}

func toJobResp(j *models.Job) jobResp {
	resp := jobResp{
		ID: j.ID, EmployerID: j.EmployerID, Title: j.Title, Type: j.Type,
		EmploymentCategory: j.EmploymentCategory, IsRemote: j.IsRemote,
		Location: j.Location, Salary: j.Salary, Description: j.Description,
		Requirements: j.Requirements, Skills: j.Skills, Deadline: j.Deadline,
		Status: j.Status, RejectionReason: j.RejectionReason,
		ApplicantCount: j.ApplicantCount, PostedAt: j.CreatedAt,
	}
	json.Unmarshal([]byte(j.RequiredDocs), &resp.RequiredDocs)
	json.Unmarshal([]byte(j.OptionalDocs), &resp.OptionalDocs)
	return resp
}

type jobWriteRequest struct {
	Title              string    `json:"title"`
	Type               string    `json:"type"`
	EmploymentCategory string    `json:"employment_category"`
	IsRemote           bool      `json:"is_remote"`
	Location           string    `json:"location"`
	Salary             string    `json:"salary"`
	Description        string    `json:"description"`
	Requirements       string    `json:"requirements"`
	Skills             string    `json:"skills"`
	RequiredDocs       []string  `json:"required_docs"`
	OptionalDocs       []string  `json:"optional_docs"`
	Deadline           time.Time `json:"deadline"`
}

func employerJobs(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var jobs []models.Job
		database.Where("employer_id = ? AND deleted_at IS NULL", auth.UserID).Order("created_at desc").Find(&jobs)
		result := make([]jobResp, 0, len(jobs))
		for _, j := range jobs {
			result = append(result, toJobResp(&j))
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPost:
		var req jobWriteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Title == "" || req.Type == "" || req.Location == "" || req.Description == "" || req.Requirements == "" {
			respond.Error(w, http.StatusBadRequest, "title, type, location, description and requirements are required")
			return
		}
		requiredJSON, _ := json.Marshal(req.RequiredDocs)
		optionalJSON, _ := json.Marshal(req.OptionalDocs)
		job := models.Job{
			EmployerID: auth.UserID, Title: req.Title, Type: req.Type, Location: req.Location,
			EmploymentCategory: req.EmploymentCategory, IsRemote: req.IsRemote,
			Salary: req.Salary, Description: req.Description, Requirements: req.Requirements,
			Skills: req.Skills, RequiredDocs: string(requiredJSON), OptionalDocs: string(optionalJSON),
			Deadline: req.Deadline, Status: "pending",
		}
		if err := database.Create(&job).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create job")
			return
		}
		notifyStaffJobAwaitingReview(database, auth.UserID, &job)
		respond.Created(w, toJobResp(&job))

	case http.MethodPut:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as ?id=")
			return
		}
		var req jobWriteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		requiredJSON, _ := json.Marshal(req.RequiredDocs)
		optionalJSON, _ := json.Marshal(req.OptionalDocs)
		database.Model(&models.Job{}).Where("id = ? AND employer_id = ?", jobID, auth.UserID).Updates(map[string]any{
			"title": req.Title, "type": req.Type, "location": req.Location, "salary": req.Salary,
			"employment_category": req.EmploymentCategory, "is_remote": req.IsRemote,
			"description": req.Description, "requirements": req.Requirements, "skills": req.Skills,
			"required_docs": string(requiredJSON), "optional_docs": string(optionalJSON), "deadline": req.Deadline,
		})
		var job models.Job
		database.Where("id = ?", jobID).First(&job)
		respond.OK(w, toJobResp(&job))

	case http.MethodDelete:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as ?id=")
			return
		}
		database.Where("id = ? AND employer_id = ?", jobID, auth.UserID).Delete(&models.Job{})
		respond.OK(w, map[string]string{"message": "job deleted"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func notifyStaffJobAwaitingReview(database *gorm.DB, employerUserID string, job *models.Job) {
	var emp models.EmployerProfile
	database.Where("user_id = ?", employerUserID).First(&emp)
	var staffUsers []models.User
	database.Where("role = ? AND deleted_at IS NULL", "staff").Find(&staffUsers)
	for _, s := range staffUsers {
		notify.CreateAndEmail(database, s.ID, employerUserID, "job_review", "Job awaiting review",
			emp.CompanyName+" submitted \""+job.Title+"\" for review", "/staff/jobs",
			func() (string, string) { return email.JobAwaitingReviewTemplate(job.Title, emp.CompanyName) })
	}
}

func employerJobDetail(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx, database *gorm.DB) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	jobID := r.URL.Query().Get("id")
	if jobID == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	var job models.Job
	if err := database.Where("id = ? AND employer_id = ? AND deleted_at IS NULL", jobID, auth.UserID).First(&job).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "job not found")
		return
	}
	respond.OK(w, toJobResp(&job))
}

// ── applications / ATS ───────────────────────────────────────────────────────

type appResp struct {
	ID             string     `json:"id"`
	StudentID      string     `json:"student_id"`
	StudentName    string     `json:"student_name"`
	StudentEmail   string     `json:"student_email"`
	Major          string     `json:"major"`
	GraduationYear int        `json:"graduation_year"`
	GPA            float64    `json:"gpa"`
	IsVerified     bool       `json:"is_verified"`
	JobID          string     `json:"job_id"`
	JobTitle       string     `json:"job_title"`
	Status         string     `json:"status"`
	Stage          string     `json:"stage"`
	StageOrder     int        `json:"stage_order"`
	Rating         int        `json:"rating"`
	AppliedAt      *time.Time `json:"applied_at"`
}

// employerOwnedJobIDs returns the job IDs belonging to this employer, and a
// title lookup map, used to scope every applications query to jobs the
// caller actually owns.
func employerOwnedJobIDs(database *gorm.DB, employerID string) ([]string, map[string]string) {
	var jobs []models.Job
	database.Where("employer_id = ? AND deleted_at IS NULL", employerID).Find(&jobs)
	ids := make([]string, 0, len(jobs))
	titles := make(map[string]string)
	for _, j := range jobs {
		ids = append(ids, j.ID)
		titles[j.ID] = j.Title
	}
	return ids, titles
}

func employerApplications(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx, database *gorm.DB) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	jobIDs, jobTitles := employerOwnedJobIDs(database, auth.UserID)
	if len(jobIDs) == 0 {
		respond.OK(w, map[string]any{"applications": []appResp{}})
		return
	}

	q := r.URL.Query()
	query := database.Where("job_id IN ? AND deleted_at IS NULL", jobIDs)
	if jobID := q.Get("job_id"); jobID != "" {
		query = query.Where("job_id = ?", jobID)
	}
	if stage := q.Get("stage"); stage != "" {
		query = query.Where("stage = ?", stage)
	}

	var apps []models.Application
	query.Order("stage_order asc, created_at desc").Find(&apps)

	// Preload ratings for this batch.
	appIDs := make([]string, 0, len(apps))
	for _, a := range apps {
		appIDs = append(appIDs, a.ID)
	}
	var notes []models.ApplicationNote
	if len(appIDs) > 0 {
		database.Where("application_id IN ?", appIDs).Find(&notes)
	}
	ratingByApp := map[string]int{}
	for _, n := range notes {
		ratingByApp[n.ApplicationID] = n.Rating
	}

	search := strings.ToLower(q.Get("q"))
	sortBy := q.Get("sort")

	result := make([]appResp, 0, len(apps))
	for _, a := range apps {
		resp := appResp{
			ID: a.ID, StudentID: a.StudentID, JobID: a.JobID, Status: a.Status,
			Stage: a.Stage, StageOrder: a.StageOrder, AppliedAt: a.AppliedAt,
			Rating: ratingByApp[a.ID],
		}
		resp.JobTitle = jobTitles[a.JobID]
		var student models.User
		if database.Where("id = ?", a.StudentID).First(&student).Error == nil {
			resp.StudentName = student.FullName
			resp.StudentEmail = student.Email
			resp.Major = student.Major
			resp.GraduationYear = student.GraduationYear
			resp.GPA = student.GPA
			resp.IsVerified = student.IsVerified
		}
		if search != "" {
			hay := strings.ToLower(resp.StudentName + " " + resp.Major)
			if !strings.Contains(hay, search) {
				continue
			}
		}
		result = append(result, resp)
	}

	switch sortBy {
	case "gpa":
		sortAppsByGPA(result)
	case "graduation_year":
		sortAppsByGradYear(result)
	case "name":
		sortAppsByName(result)
	}

	respond.OK(w, map[string]any{"applications": result})
}

func sortAppsByGPA(items []appResp) {
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && items[j].GPA > items[j-1].GPA; j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}
}

func sortAppsByGradYear(items []appResp) {
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && items[j].GraduationYear < items[j-1].GraduationYear; j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}
}

func sortAppsByName(items []appResp) {
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && strings.ToLower(items[j].StudentName) < strings.ToLower(items[j-1].StudentName); j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}
}

// loadOwnedApplication fetches an application only if it belongs to a job
// this employer owns, returning the application and its job.
func loadOwnedApplication(database *gorm.DB, employerID, appID string) (*models.Application, *models.Job, bool) {
	var app models.Application
	if err := database.Where("id = ? AND deleted_at IS NULL", appID).First(&app).Error; err != nil {
		return nil, nil, false
	}
	var job models.Job
	if err := database.Where("id = ? AND employer_id = ?", app.JobID, employerID).First(&job).Error; err != nil {
		return nil, nil, false
	}
	return &app, &job, true
}

func employerApplicationDetail(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx, database *gorm.DB) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	app, job, ok := loadOwnedApplication(database, auth.UserID, id)
	if !ok {
		respond.Error(w, http.StatusNotFound, "application not found")
		return
	}

	var student models.User
	database.Where("id = ?", app.StudentID).First(&student)

	var history []models.ApplicationStageHistory
	database.Where("application_id = ?", app.ID).Order("created_at asc").Find(&history)
	historyOut := make([]map[string]any, 0, len(history))
	for _, h := range history {
		historyOut = append(historyOut, map[string]any{
			"from_stage": h.FromStage, "to_stage": h.ToStage, "note": h.Note, "changed_by": h.ChangedBy, "created_at": h.CreatedAt,
		})
	}

	var note models.ApplicationNote
	database.Where("application_id = ? AND author_id = ?", app.ID, auth.UserID).First(&note)

	var docIDs []string
	json.Unmarshal([]byte(app.DocumentIDs), &docIDs)
	var docs []models.Document
	if len(docIDs) > 0 {
		database.Where("id IN ?", docIDs).Find(&docs)
	}
	docsOut := make([]map[string]any, 0, len(docs))
	for _, d := range docs {
		docsOut = append(docsOut, map[string]any{
			"id": d.ID, "type": d.Type, "title": d.Title, "file_url": d.FileURL, "file_name": d.FileName,
		})
	}

	respond.OK(w, map[string]any{
		"id": app.ID, "job_id": app.JobID, "job_title": job.Title,
		"student_id": student.ID, "student_name": student.FullName, "student_email": student.Email,
		"major": student.Major, "graduation_year": student.GraduationYear, "gpa": student.GPA,
		"status": app.Status, "stage": app.Stage, "applied_at": app.AppliedAt,
		"cover_letter": app.CoverLetter, "resume_url": app.ResumeURL,
		"documents": docsOut, "history": historyOut,
		"note": map[string]any{"body": note.Body, "rating": note.Rating},
	})
}

func employerApplicationStage(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx, database *gorm.DB) {
	if r.Method != http.MethodPut {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	app, job, ok := loadOwnedApplication(database, auth.UserID, id)
	if !ok {
		respond.Error(w, http.StatusNotFound, "application not found")
		return
	}
	var req struct {
		Stage      string `json:"stage"`
		Note       string `json:"note"`
		StageOrder int    `json:"stage_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !pipeline.AllowedStages[req.Stage] {
		respond.Error(w, http.StatusBadRequest, "invalid stage")
		return
	}

	fromStage := app.Stage
	legacyStatus := pipeline.ToLegacyStatus(req.Stage)
	updates := map[string]any{"stage": req.Stage, "status": legacyStatus, "stage_order": req.StageOrder}
	if req.Stage == "withdrawn" {
		now := time.Now()
		updates["withdrawn_at"] = now
	}
	database.Model(&models.Application{}).Where("id = ?", app.ID).Updates(updates)
	database.Create(&models.ApplicationStageHistory{
		ApplicationID: app.ID, FromStage: fromStage, ToStage: req.Stage, ChangedBy: auth.UserID, Note: req.Note,
	})

	var emp models.EmployerProfile
	database.Where("user_id = ?", auth.UserID).First(&emp)
	notify.CreateAndEmail(database, app.StudentID, auth.UserID, "application_status", "Application update",
		"Your application for "+job.Title+" moved to "+req.Stage, "/student/applications",
		func() (string, string) {
			return email.ApplicationStageChangedTemplate(job.Title, emp.CompanyName, req.Stage)
		})

	respond.OK(w, map[string]any{"id": app.ID, "stage": req.Stage, "status": legacyStatus})
}

func employerApplicationNotes(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx, database *gorm.DB) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	app, _, ok := loadOwnedApplication(database, auth.UserID, id)
	if !ok {
		respond.Error(w, http.StatusNotFound, "application not found")
		return
	}
	var req struct {
		Body   string `json:"body"`
		Rating int    `json:"rating"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Rating < 0 || req.Rating > 5 {
		respond.Error(w, http.StatusBadRequest, "rating must be between 0 and 5")
		return
	}

	var note models.ApplicationNote
	err := database.Where("application_id = ? AND author_id = ?", app.ID, auth.UserID).First(&note).Error
	if err != nil {
		note = models.ApplicationNote{ApplicationID: app.ID, AuthorID: auth.UserID, Body: req.Body, Rating: req.Rating}
		database.Create(&note)
	} else {
		database.Model(&note).Updates(map[string]any{"body": req.Body, "rating": req.Rating})
	}
	respond.OK(w, map[string]any{"body": req.Body, "rating": req.Rating})
}
