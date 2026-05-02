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

// Handler is the single entrypoint for all /api/staff/* routes.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if auth.Role != "staff" {
		respond.Error(w, http.StatusForbidden, "staff access required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "dashboard":
		staffDashboard(w, r)
	case "applications":
		staffApplications(w, r)
	case "jobs":
		staffJobs(w, r, auth.UserID)
	case "employers":
		staffEmployers(w, r)
	case "students":
		staffStudents(w, r)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── dashboard ─────────────────────────────────────────────────────────────────

func staffDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var stats struct {
		TotalStudents     int64 `json:"total_students"`
		TotalEmployers    int64 `json:"total_employers"`
		PendingEmployers  int64 `json:"pending_employers"`
		ActiveJobs        int64 `json:"active_jobs"`
		PendingJobs       int64 `json:"pending_jobs"`
		TotalApplications int64 `json:"total_applications"`
		UpcomingEvents    int64 `json:"upcoming_events"`
	}
	database.Model(&models.User{}).Where("role = ? AND deleted_at IS NULL", "student").Count(&stats.TotalStudents)
	database.Model(&models.EmployerProfile{}).Where("deleted_at IS NULL").Count(&stats.TotalEmployers)
	database.Model(&models.EmployerProfile{}).Where("status = ? AND deleted_at IS NULL", "pending").Count(&stats.PendingEmployers)
	database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "active").Count(&stats.ActiveJobs)
	database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "pending").Count(&stats.PendingJobs)
	database.Model(&models.Application{}).Where("deleted_at IS NULL").Count(&stats.TotalApplications)
	database.Model(&models.Event{}).Where("date > ? AND deleted_at IS NULL", time.Now()).Count(&stats.UpcomingEvents)

	respond.OK(w, stats)
}

// ── applications ──────────────────────────────────────────────────────────────

func staffApplications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type appSum struct {
		ID        string     `json:"id"`
		StudentID string     `json:"student_id"`
		Student   string     `json:"student_name"`
		JobID     string     `json:"job_id"`
		JobTitle  string     `json:"job_title"`
		Company   string     `json:"company"`
		Status    string     `json:"status"`
		AppliedAt *time.Time `json:"applied_at"`
	}

	var apps []models.Application
	database.Where("deleted_at IS NULL").Find(&apps)

	result := make([]appSum, 0, len(apps))
	for _, a := range apps {
		sum := appSum{ID: a.ID, StudentID: a.StudentID, JobID: a.JobID, Status: a.Status, AppliedAt: a.AppliedAt}
		var student models.User
		if database.Where("id = ?", a.StudentID).First(&student).Error == nil {
			sum.Student = student.FullName
		}
		var job models.Job
		if database.Where("id = ?", a.JobID).First(&job).Error == nil {
			sum.JobTitle = job.Title
			var emp models.EmployerProfile
			if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
				sum.Company = emp.CompanyName
			}
		}
		result = append(result, sum)
	}
	respond.OK(w, map[string]any{"applications": result})
}

// ── jobs ──────────────────────────────────────────────────────────────────────

func staffJobs(w http.ResponseWriter, r *http.Request, staffUserID string) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type jobSum struct {
		ID         string    `json:"id"`
		Title      string    `json:"title"`
		Company    string    `json:"company"`
		EmployerID string    `json:"employer_id"`
		Type       string    `json:"type"`
		Location   string    `json:"location"`
		Status     string    `json:"status"`
		PostedAt   time.Time `json:"posted_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var jobs []models.Job
		database.Where("deleted_at IS NULL").Order("created_at desc").Find(&jobs)
		result := make([]jobSum, 0, len(jobs))
		for _, j := range jobs {
			s := jobSum{ID: j.ID, Title: j.Title, EmployerID: j.EmployerID, Type: j.Type, Location: j.Location, Status: j.Status, PostedAt: j.CreatedAt}
			var emp models.EmployerProfile
			if database.Where("user_id = ?", j.EmployerID).First(&emp).Error == nil {
				s.Company = emp.CompanyName
			}
			result = append(result, s)
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPost:
		var req struct {
			Title        string `json:"title"`
			Type         string `json:"type"`
			Location     string `json:"location"`
			Salary       string `json:"salary"`
			Description  string `json:"description"`
			Requirements string `json:"requirements"`
			Skills       string `json:"skills"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Title == "" || req.Location == "" || req.Description == "" {
			respond.Error(w, http.StatusBadRequest, "title, location and description are required")
			return
		}
		jobType := req.Type
		if jobType == "" {
			jobType = "full-time"
		}
		job := models.Job{
			EmployerID:   staffUserID,
			Title:        req.Title,
			Type:         jobType,
			Location:     req.Location,
			Salary:       req.Salary,
			Description:  req.Description,
			Requirements: req.Requirements,
			Skills:       req.Skills,
			Status:       "active",
		}
		if err := database.Create(&job).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create job")
			return
		}
		respond.OK(w, map[string]string{"message": "job posted", "id": job.ID})

	case http.MethodPut:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as ?id=")
			return
		}
		var req struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		allowed := map[string]bool{"active": true, "pending": true, "rejected": true, "archived": true}
		if !allowed[req.Status] {
			respond.Error(w, http.StatusBadRequest, "invalid status value")
			return
		}
		database.Model(&models.Job{}).Where("id = ?", jobID).Update("status", req.Status)
		respond.OK(w, map[string]string{"message": "job status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── employers ─────────────────────────────────────────────────────────────────

func staffEmployers(w http.ResponseWriter, r *http.Request) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type empSum struct {
		ID          string    `json:"id"`
		CompanyName string    `json:"company_name"`
		Industry    string    `json:"industry"`
		Location    string    `json:"location"`
		Email       string    `json:"contact_email"`
		Status      string    `json:"status"`
		CreatedAt   time.Time `json:"created_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var profiles []models.EmployerProfile
		database.Where("deleted_at IS NULL").Order("created_at desc").Find(&profiles)
		result := make([]empSum, 0, len(profiles))
		for _, p := range profiles {
			result = append(result, empSum{ID: p.ID, CompanyName: p.CompanyName, Industry: p.Industry, Location: p.Location, Email: p.ContactEmail, Status: p.Status, CreatedAt: p.CreatedAt})
		}
		respond.OK(w, map[string]any{"employers": result})

	case http.MethodPut:
		profileID := r.URL.Query().Get("id")
		if profileID == "" {
			respond.Error(w, http.StatusBadRequest, "profile id required as ?id=")
			return
		}
		var req struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		allowed := map[string]bool{"approved": true, "pending": true, "rejected": true}
		if !allowed[req.Status] {
			respond.Error(w, http.StatusBadRequest, "invalid status value")
			return
		}
		database.Model(&models.EmployerProfile{}).Where("id = ?", profileID).Update("status", req.Status)
		respond.OK(w, map[string]string{"message": "employer status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── students ──────────────────────────────────────────────────────────────────

func staffStudents(w http.ResponseWriter, r *http.Request) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type stuSum struct {
		ID             string    `json:"id"`
		FullName       string    `json:"full_name"`
		Email          string    `json:"email"`
		Major          string    `json:"major"`
		GraduationYear int       `json:"graduation_year"`
		IsVerified     bool      `json:"is_verified"`
		CreatedAt      time.Time `json:"created_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var users []models.User
		database.Where("role = ? AND deleted_at IS NULL", "student").Order("created_at desc").Find(&users)

		result := make([]stuSum, 0, len(users))
		for _, u := range users {
			result = append(result, stuSum{ID: u.ID, FullName: u.FullName, Email: u.Email, Major: u.Major, GraduationYear: u.GraduationYear, IsVerified: u.IsVerified, CreatedAt: u.CreatedAt})
		}
		respond.OK(w, map[string]any{"students": result})

	case http.MethodPut:
		studentID := r.URL.Query().Get("id")
		if studentID == "" {
			respond.Error(w, http.StatusBadRequest, "student id required as ?id=")
			return
		}
		var req struct {
			Verified bool `json:"verified"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		database.Model(&models.User{}).Where("id = ? AND role = ?", studentID, "student").Update("is_verified", req.Verified)
		respond.OK(w, map[string]string{"message": "student verification updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
