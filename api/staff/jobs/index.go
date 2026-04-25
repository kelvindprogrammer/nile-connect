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

type jobSummary struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Company    string    `json:"company"`
	EmployerID string    `json:"employer_id"`
	Type       string    `json:"type"`
	Location   string    `json:"location"`
	Status     string    `json:"status"`
	PostedAt   time.Time `json:"posted_at"`
}

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

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var jobs []models.Job
		if err := database.Where("deleted_at IS NULL").Order("created_at desc").Find(&jobs).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch jobs")
			return
		}
		result := make([]jobSummary, 0, len(jobs))
		for _, j := range jobs {
			sum := jobSummary{
				ID:         j.ID,
				Title:      j.Title,
				EmployerID: j.EmployerID,
				Type:       j.Type,
				Location:   j.Location,
				Status:     j.Status,
				PostedAt:   j.CreatedAt,
			}
			var emp models.EmployerProfile
			if database.Where("user_id = ?", j.EmployerID).First(&emp).Error == nil {
				sum.Company = emp.CompanyName
			}
			result = append(result, sum)
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPut:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as query param ?id=")
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
		if err := database.Model(&models.Job{}).Where("id = ?", jobID).Update("status", req.Status).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update job status")
			return
		}
		respond.OK(w, map[string]string{"message": "job status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
