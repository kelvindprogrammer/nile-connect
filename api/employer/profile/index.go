package handler

import (
	"encoding/json"
	"net/http"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type profileResponse struct {
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

type updateRequest struct {
	CompanyName  string `json:"company_name"`
	Industry     string `json:"industry"`
	Location     string `json:"location"`
	About        string `json:"about"`
	ContactEmail string `json:"contact_email"`
	Website      string `json:"website"`
	LinkedIn     string `json:"linkedin"`
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
	if auth.Role != "employer" {
		respond.Error(w, http.StatusForbidden, "employer access required")
		return
	}

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
		respond.OK(w, toResponse(&profile))

	case http.MethodPut:
		var req updateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updates := map[string]any{
			"company_name":  req.CompanyName,
			"industry":      req.Industry,
			"location":      req.Location,
			"about":         req.About,
			"contact_email": req.ContactEmail,
			"website":       req.Website,
			"linkedin":      req.LinkedIn,
		}
		if err := database.Model(&models.EmployerProfile{}).Where("user_id = ?", auth.UserID).Updates(updates).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update profile")
			return
		}
		var profile models.EmployerProfile
		database.Where("user_id = ?", auth.UserID).First(&profile)
		respond.OK(w, toResponse(&profile))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func toResponse(p *models.EmployerProfile) profileResponse {
	return profileResponse{
		ID:           p.ID,
		UserID:       p.UserID,
		CompanyName:  p.CompanyName,
		Industry:     p.Industry,
		Location:     p.Location,
		About:        p.About,
		ContactEmail: p.ContactEmail,
		Website:      p.Website,
		LinkedIn:     p.LinkedIn,
		Status:       p.Status,
	}
}
