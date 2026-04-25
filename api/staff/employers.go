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

type employerSummary struct {
	ID          string    `json:"id"`
	CompanyName string    `json:"company_name"`
	Industry    string    `json:"industry"`
	Location    string    `json:"location"`
	Email       string    `json:"contact_email"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
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
		var profiles []models.EmployerProfile
		if err := database.Where("deleted_at IS NULL").Order("created_at desc").Find(&profiles).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch employers")
			return
		}
		result := make([]employerSummary, 0, len(profiles))
		for _, p := range profiles {
			result = append(result, employerSummary{
				ID:          p.ID,
				CompanyName: p.CompanyName,
				Industry:    p.Industry,
				Location:    p.Location,
				Email:       p.ContactEmail,
				Status:      p.Status,
				CreatedAt:   p.CreatedAt,
			})
		}
		respond.OK(w, map[string]any{"employers": result})

	case http.MethodPut:
		profileID := r.URL.Query().Get("id")
		if profileID == "" {
			respond.Error(w, http.StatusBadRequest, "profile id is required as query param ?id=")
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
		if err := database.Model(&models.EmployerProfile{}).Where("id = ?", profileID).Update("status", req.Status).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update employer status")
			return
		}
		respond.OK(w, map[string]string{"message": "employer status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
