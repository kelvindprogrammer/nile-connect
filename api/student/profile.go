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
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	StudentSubtype *string `json:"student_subtype,omitempty"`
	Major          string  `json:"major"`
	GraduationYear int     `json:"graduation_year"`
	IsVerified     bool    `json:"is_verified"`
}

type updateRequest struct {
	FullName       string `json:"full_name"`
	Major          string `json:"major"`
	GraduationYear int    `json:"graduation_year"`
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
		respond.OK(w, toProfileResponse(&user))

	case http.MethodPut:
		var req updateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		result := database.Model(&models.User{}).Where("id = ?", auth.UserID).Updates(map[string]any{
			"full_name":       req.FullName,
			"major":           req.Major,
			"graduation_year": req.GraduationYear,
		})
		if result.Error != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update profile")
			return
		}
		var user models.User
		database.Where("id = ?", auth.UserID).First(&user)
		respond.OK(w, toProfileResponse(&user))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func toProfileResponse(u *models.User) profileResponse {
	pr := profileResponse{
		ID:             u.ID,
		FullName:       u.FullName,
		Username:       u.Username,
		Email:          u.Email,
		Role:           u.Role,
		Major:          u.Major,
		GraduationYear: u.GraduationYear,
		IsVerified:     u.IsVerified,
	}
	if u.StudentSubtype != "" {
		st := u.StudentSubtype
		pr.StudentSubtype = &st
	}
	return pr
}
