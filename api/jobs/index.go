package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"

	"gorm.io/gorm"
)

type jobListItem struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	CompanyName    string    `json:"company_name"`
	Location       string    `json:"location"`
	Type           string    `json:"type"`
	Salary         string    `json:"salary"`
	Skills         string    `json:"skills"`
	Description    string    `json:"description"`
	ApplicantCount int       `json:"applicant_count"`
	PostedAt       time.Time `json:"posted_at"`
	Deadline       time.Time `json:"deadline"`
}

type applyRequest struct {
	JobID       string `json:"job_id"`
	CoverLetter string `json:"cover_letter"`
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

	switch r.Method {
	case http.MethodGet:
		q := r.URL.Query()
		query := database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "active")
		if t := q.Get("type"); t != "" {
			query = query.Where("type = ?", t)
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
				ID:             j.ID,
				Title:          j.Title,
				Location:       j.Location,
				Type:           j.Type,
				Salary:         j.Salary,
				Skills:         j.Skills,
				Description:    j.Description,
				ApplicantCount: j.ApplicantCount,
				PostedAt:       j.CreatedAt,
				Deadline:       j.Deadline,
			}
			var emp models.EmployerProfile
			if database.Where("user_id = ?", j.EmployerID).First(&emp).Error == nil {
				item.CompanyName = emp.CompanyName
			}
			result = append(result, item)
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPost:
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

		var existing int64
		database.Model(&models.Application{}).Where("job_id = ? AND student_id = ? AND deleted_at IS NULL", req.JobID, auth.UserID).Count(&existing)
		if existing > 0 {
			respond.Error(w, http.StatusConflict, "already applied to this job")
			return
		}

		now := time.Now()
		app := models.Application{
			JobID:     req.JobID,
			StudentID: auth.UserID,
			Status:    "applied",
			AppliedAt: &now,
		}
		if err := database.Create(&app).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not submit application")
			return
		}
		database.Model(&models.Job{}).Where("id = ?", req.JobID).UpdateColumn("applicant_count", gorm.Expr("applicant_count + 1"))

		respond.Created(w, map[string]any{
			"id":         app.ID,
			"status":     app.Status,
			"applied_at": app.AppliedAt,
			"message":    "Application submitted successfully",
		})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
