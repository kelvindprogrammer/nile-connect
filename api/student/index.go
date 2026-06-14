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

// Handler is the single entrypoint for all /api/student/* routes.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "profile":
		studentProfile(w, r, auth)
	case "applications":
		studentApplications(w, r, auth)
	case "services":
		studentServices(w, r, auth)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── profile ───────────────────────────────────────────────────────────────────

type profileResp struct {
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	StudentSubtype *string `json:"student_subtype,omitempty"`
	Major          string  `json:"major"`
	GraduationYear int     `json:"graduation_year"`
	IsVerified     bool    `json:"is_verified"`
	ResumeURL      string  `json:"resume_url"`
}

func toProfileResp(u *models.User) profileResp {
	pr := profileResp{
		ID:             u.ID,
		FullName:       u.FullName,
		Username:       u.Username,
		Email:          u.Email,
		Role:           u.Role,
		Major:          u.Major,
		GraduationYear: u.GraduationYear,
		IsVerified:     u.IsVerified,
		ResumeURL:      u.ResumeURL,
	}
	if u.StudentSubtype != "" {
		st := u.StudentSubtype
		pr.StudentSubtype = &st
	}
	return pr
}

func studentProfile(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var user models.User
		if err := database.Where("id = ? AND deleted_at IS NULL", auth.UserID).First(&user).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "profile not found")
			return
		}
		respond.OK(w, toProfileResp(&user))

	case http.MethodPut:
		var req struct {
			FullName       *string `json:"full_name"`
			Major          *string `json:"major"`
			GraduationYear *int    `json:"graduation_year"`
			ResumeURL      *string `json:"resume_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updates := map[string]any{}
		if req.FullName != nil {
			updates["full_name"] = *req.FullName
		}
		if req.Major != nil {
			updates["major"] = *req.Major
		}
		if req.GraduationYear != nil {
			updates["graduation_year"] = *req.GraduationYear
		}
		if req.ResumeURL != nil {
			updates["resume_url"] = *req.ResumeURL
		}
		if len(updates) > 0 {
			database.Model(&models.User{}).Where("id = ?", auth.UserID).Updates(updates)
		}
		var user models.User
		database.Where("id = ?", auth.UserID).First(&user)
		respond.OK(w, toProfileResp(&user))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── applications ──────────────────────────────────────────────────────────────

type appItem struct {
	ID          string     `json:"id"`
	JobID       string     `json:"job_id"`
	JobTitle    string     `json:"job_title"`
	CompanyName string     `json:"company_name"`
	Status      string     `json:"status"`
	AppliedAt   *time.Time `json:"applied_at"`
}

func studentApplications(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var apps []models.Application
	database.Where("student_id = ? AND deleted_at IS NULL", auth.UserID).Find(&apps)

	result := make([]appItem, 0, len(apps))
	for _, a := range apps {
		item := appItem{ID: a.ID, JobID: a.JobID, Status: a.Status, AppliedAt: a.AppliedAt}
		var job models.Job
		if database.Where("id = ?", a.JobID).First(&job).Error == nil {
			item.JobTitle = job.Title
			var emp models.EmployerProfile
			if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
				item.CompanyName = emp.CompanyName
			}
		}
		result = append(result, item)
	}
	respond.OK(w, map[string]any{"applications": result})
}

// ── career services ──────────────────────────────────────────────────────────

var allowedServiceTypes = map[string]bool{
	"mock_interview":  true,
	"career_advisory": true,
	"cv_review":       true,
}

type serviceRequestItem struct {
	ID          string     `json:"id"`
	Type        string     `json:"type"`
	Status      string     `json:"status"`
	Notes       string     `json:"notes"`
	Feedback    string     `json:"feedback"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	RoomID      string     `json:"room_id"`
	StaffName   string     `json:"staff_name"`
	CreatedAt   time.Time  `json:"created_at"`
}

func studentServices(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var reqs []models.ServiceRequest
		database.Where("student_id = ? AND deleted_at IS NULL", auth.UserID).Order("created_at desc").Find(&reqs)

		result := make([]serviceRequestItem, 0, len(reqs))
		for _, sr := range reqs {
			item := serviceRequestItem{
				ID: sr.ID, Type: sr.Type, Status: sr.Status, Notes: sr.Notes,
				Feedback: sr.Feedback, ScheduledAt: sr.ScheduledAt, RoomID: sr.RoomID,
				CreatedAt: sr.CreatedAt,
			}
			if sr.StaffID != "" {
				var staff models.User
				if database.Where("id = ?", sr.StaffID).First(&staff).Error == nil {
					item.StaffName = staff.FullName
				}
			}
			result = append(result, item)
		}
		respond.OK(w, map[string]any{"requests": result})

	case http.MethodPost:
		var req struct {
			Type  string `json:"type"`
			Notes string `json:"notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if !allowedServiceTypes[req.Type] {
			respond.Error(w, http.StatusBadRequest, "invalid service type")
			return
		}
		sr := models.ServiceRequest{
			StudentID: auth.UserID,
			Type:      req.Type,
			Status:    "pending",
			Notes:     req.Notes,
		}
		if err := database.Create(&sr).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create request")
			return
		}
		respond.Created(w, map[string]any{
			"id":      sr.ID,
			"status":  sr.Status,
			"message": "Request submitted successfully",
		})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
