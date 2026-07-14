package handler

import (
	"encoding/json"
	"net/http"
	"os"
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

// cronAuthorized checks the bearer token Vercel Cron sends against
// CRON_SECRET so the reminder endpoint isn't publicly triggerable.
func cronAuthorized(r *http.Request) bool {
	secret := os.Getenv("CRON_SECRET")
	if secret == "" {
		return false
	}
	return r.Header.Get("Authorization") == "Bearer "+secret
}

type employerCard struct {
	CompanyName  string `json:"company_name"`
	LogoURL      string `json:"logo_url"`
	Industry     string `json:"industry"`
	CompanySize  string `json:"company_size"`
	Headquarters string `json:"headquarters"`
	Website      string `json:"website"`
	About        string `json:"about"`
	IsVerified   bool   `json:"is_verified"`
}

func toEmployerCard(emp *models.EmployerProfile) employerCard {
	return employerCard{
		CompanyName: emp.CompanyName, LogoURL: emp.LogoURL, Industry: emp.Industry,
		CompanySize: emp.CompanySize, Headquarters: emp.Headquarters, Website: emp.Website,
		About: emp.About, IsVerified: emp.IsVerified,
	}
}

type jobListItem struct {
	ID                 string    `json:"id"`
	Title              string    `json:"title"`
	CompanyName        string    `json:"company_name"`
	Location           string    `json:"location"`
	Type               string    `json:"type"`
	EmploymentCategory string    `json:"employment_category"`
	IsRemote           bool      `json:"is_remote"`
	Salary             string    `json:"salary"`
	Skills             string    `json:"skills"`
	Description        string    `json:"description"`
	ApplicantCount     int       `json:"applicant_count"`
	PostedAt           time.Time `json:"posted_at"`
	Deadline           time.Time `json:"deadline"`
}

type applyRequest struct {
	JobID       string   `json:"job_id"`
	CoverLetter string   `json:"cover_letter"`
	ResumeURL   string   `json:"resume_url"`
	DocumentIDs []string `json:"document_ids"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	// New path-based routes. Falls through to the legacy method-based
	// routing below when no ?path= is supplied, so existing frontend calls
	// keep working.
	switch r.URL.Query().Get("path") {
	case "detail":
		jobDetailHandler(w, r, database)
		return
	case "withdraw":
		withdrawApplication(w, r, database)
		return
	case "deadline-reminders":
		deadlineReminders(w, r, database)
		return
	}

	switch r.Method {
	case http.MethodGet:
		q := r.URL.Query()

		// GET /api/jobs?id=<uuid> — single job detail (legacy shape)
		if jobID := q.Get("id"); jobID != "" {
			jobDetailHandler(w, r, database)
			return
		}

		query := database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "active")
		if t := q.Get("type"); t != "" {
			query = query.Where("type = ?", t)
		}
		if cat := q.Get("employment_category"); cat != "" {
			query = query.Where("employment_category = ?", cat)
		}
		if loc := q.Get("location"); loc != "" {
			query = query.Where("location ILIKE ?", "%"+loc+"%")
		}
		if ind := q.Get("industry"); ind != "" {
			query = query.Where("skills ILIKE ?", "%"+ind+"%")
		}
		if search := q.Get("q"); search != "" {
			pattern := "%" + search + "%"
			query = query.Where("title ILIKE ? OR description ILIKE ? OR skills ILIKE ?", pattern, pattern, pattern)
		}

		var jobs []models.Job
		if err := query.Order("created_at desc").Limit(50).Find(&jobs).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch jobs")
			return
		}

		result := make([]jobListItem, 0, len(jobs))
		for _, j := range jobs {
			item := jobListItem{
				ID: j.ID, Title: j.Title, Location: j.Location, Type: j.Type,
				EmploymentCategory: j.EmploymentCategory, IsRemote: j.IsRemote,
				Salary: j.Salary, Skills: j.Skills, Description: j.Description,
				ApplicantCount: j.ApplicantCount, PostedAt: j.CreatedAt, Deadline: j.Deadline,
			}
			var emp models.EmployerProfile
			if database.Where("user_id = ?", j.EmployerID).First(&emp).Error == nil {
				item.CompanyName = emp.CompanyName
			}
			result = append(result, item)
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPost:
		applyToJob(w, r, database)

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── job detail ────────────────────────────────────────────────────────────────

type jobDetail struct {
	ID                 string        `json:"id"`
	Title              string        `json:"title"`
	Location           string        `json:"location"`
	Type               string        `json:"type"`
	EmploymentCategory string        `json:"employment_category"`
	IsRemote           bool          `json:"is_remote"`
	Salary             string        `json:"salary"`
	Skills             string        `json:"skills"`
	Description        string        `json:"description"`
	Requirements       string        `json:"requirements"`
	Status             string        `json:"status"`
	RequiredDocs       []string      `json:"required_docs"`
	OptionalDocs       []string      `json:"optional_docs"`
	ApplicantCount     int           `json:"applicant_count"`
	PostedAt           time.Time     `json:"posted_at"`
	Deadline           time.Time     `json:"deadline"`
	Employer           employerCard  `json:"employer"`
	OtherOpenPositions []jobListItem `json:"other_open_positions"`
}

func jobDetailHandler(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
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
	if err := database.Where("id = ? AND deleted_at IS NULL", jobID).First(&job).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "job not found")
		return
	}

	detail := jobDetail{
		ID: job.ID, Title: job.Title, Location: job.Location, Type: job.Type,
		EmploymentCategory: job.EmploymentCategory, IsRemote: job.IsRemote,
		Salary: job.Salary, Skills: job.Skills, Description: job.Description,
		Requirements: job.Requirements, Status: job.Status,
		ApplicantCount: job.ApplicantCount, PostedAt: job.CreatedAt, Deadline: job.Deadline,
	}
	json.Unmarshal([]byte(job.RequiredDocs), &detail.RequiredDocs)
	json.Unmarshal([]byte(job.OptionalDocs), &detail.OptionalDocs)

	var emp models.EmployerProfile
	if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
		detail.Employer = toEmployerCard(&emp)
	}

	var others []models.Job
	database.Where("employer_id = ? AND id != ? AND status = ? AND deleted_at IS NULL", job.EmployerID, job.ID, "active").
		Order("created_at desc").Limit(5).Find(&others)
	detail.OtherOpenPositions = make([]jobListItem, 0, len(others))
	for _, j := range others {
		detail.OtherOpenPositions = append(detail.OtherOpenPositions, jobListItem{
			ID: j.ID, Title: j.Title, CompanyName: emp.CompanyName, Location: j.Location, Type: j.Type,
			EmploymentCategory: j.EmploymentCategory, IsRemote: j.IsRemote, Salary: j.Salary,
			Skills: j.Skills, Description: j.Description, ApplicantCount: j.ApplicantCount,
			PostedAt: j.CreatedAt, Deadline: j.Deadline,
		})
	}

	respond.OK(w, map[string]any{"job": detail})
}

// ── apply ─────────────────────────────────────────────────────────────────────

func applyToJob(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req applyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.JobID == "" {
		respond.Error(w, http.StatusBadRequest, "job_id is required")
		return
	}

	var job models.Job
	if err := database.Where("id = ? AND deleted_at IS NULL", req.JobID).First(&job).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "job not found")
		return
	}

	var existing int64
	database.Model(&models.Application{}).Where("job_id = ? AND student_id = ? AND deleted_at IS NULL", req.JobID, auth.UserID).Count(&existing)
	if existing > 0 {
		respond.Error(w, http.StatusConflict, "already applied to this job")
		return
	}

	// Validate any selected documents belong to the applicant and satisfy
	// the job's required document types.
	docIDs := req.DocumentIDs
	if len(docIDs) > 0 {
		var docs []models.Document
		database.Where("id IN ? AND user_id = ? AND deleted_at IS NULL", docIDs, auth.UserID).Find(&docs)
		if len(docs) != len(docIDs) {
			respond.Error(w, http.StatusBadRequest, "one or more selected documents are invalid")
			return
		}
		var required []string
		json.Unmarshal([]byte(job.RequiredDocs), &required)
		haveTypes := map[string]bool{}
		for _, d := range docs {
			haveTypes[d.Type] = true
		}
		for _, rt := range required {
			if !haveTypes[rt] {
				respond.Error(w, http.StatusBadRequest, "missing required document: "+rt)
				return
			}
		}
	}
	docIDsJSON, _ := json.Marshal(docIDs)

	// Fall back to the resume on the student's profile if none was
	// supplied with this specific application.
	resumeURL := req.ResumeURL
	var student models.User
	database.Where("id = ?", auth.UserID).First(&student)
	if resumeURL == "" {
		resumeURL = student.ResumeURL
	}

	now := time.Now()
	app := models.Application{
		JobID:       req.JobID,
		StudentID:   auth.UserID,
		Status:      "applied",
		Stage:       "submitted",
		AppliedAt:   &now,
		CoverLetter: req.CoverLetter,
		ResumeURL:   resumeURL,
		DocumentIDs: string(docIDsJSON),
	}
	if err := database.Create(&app).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not submit application")
		return
	}
	database.Model(&models.Job{}).Where("id = ?", req.JobID).UpdateColumn("applicant_count", gorm.Expr("applicant_count + 1"))
	database.Create(&models.ApplicationStageHistory{
		ApplicationID: app.ID, FromStage: "", ToStage: "submitted", ChangedBy: auth.UserID,
	})

	notify.CreateAndEmail(database, job.EmployerID, auth.UserID, "application", "New job application",
		student.FullName+" applied to "+job.Title, "/employer/applications",
		func() (string, string) { return email.NewApplicationTemplate(student.FullName, job.Title) })
	email.SendApplicationConfirmation(student.Email, student.FullName, job.Title)

	respond.Created(w, map[string]any{
		"id":         app.ID,
		"status":     app.Status,
		"stage":      app.Stage,
		"applied_at": app.AppliedAt,
		"message":    "Application submitted successfully",
	})
}

// ── withdraw ──────────────────────────────────────────────────────────────────

func withdrawApplication(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req struct {
		ApplicationID string `json:"application_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ApplicationID == "" {
		respond.Error(w, http.StatusBadRequest, "application_id is required")
		return
	}
	var app models.Application
	if err := database.Where("id = ? AND student_id = ? AND deleted_at IS NULL", req.ApplicationID, auth.UserID).First(&app).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "application not found")
		return
	}
	if app.Stage == "withdrawn" || app.Stage == "rejected" || app.Stage == "accepted" {
		respond.Error(w, http.StatusConflict, "application cannot be withdrawn in its current stage")
		return
	}
	now := time.Now()
	fromStage := app.Stage
	database.Model(&app).Updates(map[string]any{
		"stage": "withdrawn", "status": pipeline.ToLegacyStatus("withdrawn"), "withdrawn_at": now,
	})
	database.Create(&models.ApplicationStageHistory{
		ApplicationID: app.ID, FromStage: fromStage, ToStage: "withdrawn", ChangedBy: auth.UserID,
	})

	var job models.Job
	database.Where("id = ?", app.JobID).First(&job)
	var student models.User
	database.Where("id = ?", auth.UserID).First(&student)
	notify.CreateAndEmail(database, job.EmployerID, auth.UserID, "application_status", "Candidate withdrew",
		student.FullName+" withdrew their application for "+job.Title, "/employer/applications",
		func() (string, string) { return email.CandidateWithdrewTemplate(student.FullName, job.Title) })

	respond.OK(w, map[string]any{"id": app.ID, "stage": "withdrawn"})
}

// ── deadline reminders (cron) ────────────────────────────────────────────────

func deadlineReminders(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	if !cronAuthorized(r) {
		respond.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	windowStart := time.Now()
	windowEnd := windowStart.Add(48 * time.Hour)

	var jobs []models.Job
	database.Where("status = ? AND deadline BETWEEN ? AND ? AND deleted_at IS NULL", "active", windowStart, windowEnd).Find(&jobs)

	sent := 0
	for _, job := range jobs {
		var students []models.User
		database.Where("role = ? AND deleted_at IS NULL", "student").Find(&students)
		for _, s := range students {
			var count int64
			database.Model(&models.Application{}).Where("job_id = ? AND student_id = ? AND deleted_at IS NULL", job.ID, s.ID).Count(&count)
			if count > 0 {
				continue
			}
			email.SendDeadlineReminder(s.Email, s.FullName, job.Title, job.Deadline)
			sent++
		}
	}
	respond.OK(w, map[string]any{"reminders_sent": sent, "jobs_checked": len(jobs)})
}
