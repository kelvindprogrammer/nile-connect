package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
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
	if auth.Role != "employer" {
		respond.Error(w, http.StatusForbidden, "employer access required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "profile":
		employerProfile(w, r, auth)
	case "jobs":
		employerJobs(w, r, auth)
	case "applications":
		employerApplications(w, r, auth)
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
}

func toProfileResp(p *models.EmployerProfile) profileResp {
	return profileResp{
		ID: p.ID, UserID: p.UserID, CompanyName: p.CompanyName,
		Industry: p.Industry, Location: p.Location, About: p.About,
		ContactEmail: p.ContactEmail, Website: p.Website, LinkedIn: p.LinkedIn, Status: p.Status,
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
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		database.Model(&models.EmployerProfile{}).Where("user_id = ?", auth.UserID).Updates(map[string]any{
			"company_name": req.CompanyName, "industry": req.Industry, "location": req.Location,
			"about": req.About, "contact_email": req.ContactEmail, "website": req.Website, "linkedin": req.LinkedIn,
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
	ID             string    `json:"id"`
	EmployerID     string    `json:"employer_id"`
	Title          string    `json:"title"`
	Type           string    `json:"type"`
	Location       string    `json:"location"`
	Salary         string    `json:"salary"`
	Description    string    `json:"description"`
	Requirements   string    `json:"requirements"`
	Skills         string    `json:"skills"`
	Deadline       time.Time `json:"deadline"`
	Status         string    `json:"status"`
	ApplicantCount int       `json:"applicant_count"`
	PostedAt       time.Time `json:"posted_at"`
}

func toJobResp(j *models.Job) jobResp {
	return jobResp{
		ID: j.ID, EmployerID: j.EmployerID, Title: j.Title, Type: j.Type,
		Location: j.Location, Salary: j.Salary, Description: j.Description,
		Requirements: j.Requirements, Skills: j.Skills, Deadline: j.Deadline,
		Status: j.Status, ApplicantCount: j.ApplicantCount, PostedAt: j.CreatedAt,
	}
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
		var req struct {
			Title        string    `json:"title"`
			Type         string    `json:"type"`
			Location     string    `json:"location"`
			Salary       string    `json:"salary"`
			Description  string    `json:"description"`
			Requirements string    `json:"requirements"`
			Skills       string    `json:"skills"`
			Deadline     time.Time `json:"deadline"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Title == "" || req.Type == "" || req.Location == "" || req.Description == "" || req.Requirements == "" {
			respond.Error(w, http.StatusBadRequest, "title, type, location, description and requirements are required")
			return
		}
		job := models.Job{
			EmployerID: auth.UserID, Title: req.Title, Type: req.Type, Location: req.Location,
			Salary: req.Salary, Description: req.Description, Requirements: req.Requirements,
			Skills: req.Skills, Deadline: req.Deadline, Status: "pending",
		}
		if err := database.Create(&job).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create job")
			return
		}
		respond.Created(w, toJobResp(&job))

	case http.MethodPut:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as ?id=")
			return
		}
		var req struct {
			Title        string    `json:"title"`
			Type         string    `json:"type"`
			Location     string    `json:"location"`
			Salary       string    `json:"salary"`
			Description  string    `json:"description"`
			Requirements string    `json:"requirements"`
			Skills       string    `json:"skills"`
			Deadline     time.Time `json:"deadline"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		database.Model(&models.Job{}).Where("id = ? AND employer_id = ?", jobID, auth.UserID).Updates(map[string]any{
			"title": req.Title, "type": req.Type, "location": req.Location, "salary": req.Salary,
			"description": req.Description, "requirements": req.Requirements, "skills": req.Skills, "deadline": req.Deadline,
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

// ── applications ──────────────────────────────────────────────────────────────

func employerApplications(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type appResp struct {
		ID             string     `json:"id"`
		StudentID      string     `json:"student_id"`
		StudentName    string     `json:"student_name"`
		StudentEmail   string     `json:"student_email"`
		Major          string     `json:"major"`
		GraduationYear int        `json:"graduation_year"`
		IsVerified     bool       `json:"is_verified"`
		JobID          string     `json:"job_id"`
		JobTitle       string     `json:"job_title"`
		Status         string     `json:"status"`
		AppliedAt      *time.Time `json:"applied_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var jobs []models.Job
		database.Where("employer_id = ? AND deleted_at IS NULL", auth.UserID).Find(&jobs)
		if len(jobs) == 0 {
			respond.OK(w, map[string]any{"applications": []appResp{}})
			return
		}
		jobIDs := make([]string, 0, len(jobs))
		jobMap := make(map[string]string)
		for _, j := range jobs {
			jobIDs = append(jobIDs, j.ID)
			jobMap[j.ID] = j.Title
		}
		var apps []models.Application
		database.Where("job_id IN ? AND deleted_at IS NULL", jobIDs).Order("created_at desc").Find(&apps)
		result := make([]appResp, 0, len(apps))
		for _, a := range apps {
			resp := appResp{ID: a.ID, StudentID: a.StudentID, JobID: a.JobID, Status: a.Status, AppliedAt: a.AppliedAt}
			resp.JobTitle = jobMap[a.JobID]
			var student models.User
			if database.Where("id = ?", a.StudentID).First(&student).Error == nil {
				resp.StudentName = student.FullName
				resp.StudentEmail = student.Email
				resp.Major = student.Major
				resp.GraduationYear = student.GraduationYear
				resp.IsVerified = student.IsVerified
			}
			result = append(result, resp)
		}
		respond.OK(w, map[string]any{"applications": result})

	case http.MethodPut:
		appID := r.URL.Query().Get("id")
		if appID == "" {
			respond.Error(w, http.StatusBadRequest, "application id required as ?id=")
			return
		}
		var req struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		allowed := map[string]bool{"applied": true, "screening": true, "interview": true, "offer": true, "rejected": true}
		if !allowed[req.Status] {
			respond.Error(w, http.StatusBadRequest, "invalid status")
			return
		}
		database.Model(&models.Application{}).Where("id = ?", appID).Update("status", req.Status)
		respond.OK(w, map[string]string{"message": "application status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
