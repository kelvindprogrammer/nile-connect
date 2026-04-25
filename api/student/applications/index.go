package handler

import (
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type applicationItem struct {
	ID          string     `json:"id"`
	JobID       string     `json:"job_id"`
	JobTitle    string     `json:"job_title"`
	CompanyName string     `json:"company_name"`
	Status      string     `json:"status"`
	AppliedAt   *time.Time `json:"applied_at"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
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

	var apps []models.Application
	if err := database.Where("student_id = ? AND deleted_at IS NULL", auth.UserID).Find(&apps).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not fetch applications")
		return
	}

	result := make([]applicationItem, 0, len(apps))
	for _, a := range apps {
		item := applicationItem{
			ID:        a.ID,
			JobID:     a.JobID,
			Status:    a.Status,
			AppliedAt: a.AppliedAt,
		}
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
