package handler

import (
	"encoding/json"
	"net/http"

	"nile-connect/lib/db"
	"nile-connect/lib/jwtutil"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type completeRequest struct {
	UserID         string `json:"user_id"`
	Major          string `json:"major"`
	GraduationYear int    `json:"graduation_year"`
}

type userResponse struct {
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	StudentSubtype *string `json:"student_subtype,omitempty"`
	Major          *string `json:"major,omitempty"`
	GraduationYear *int    `json:"graduation_year,omitempty"`
	IsVerified     bool    `json:"is_verified"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req completeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.UserID == "" || req.Major == "" || req.GraduationYear == 0 {
		respond.Error(w, http.StatusBadRequest, "user_id, major, and graduation_year are required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var user models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", req.UserID).First(&user).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "user not found")
		return
	}

	user.Major = req.Major
	user.GraduationYear = req.GraduationYear
	if err := database.Save(&user).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not update profile")
		return
	}

	token, err := jwtutil.Generate(user.ID, user.Role, user.StudentSubtype)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}

	ur := userResponse{
		ID:         user.ID,
		FullName:   user.FullName,
		Username:   user.Username,
		Email:      user.Email,
		Role:       user.Role,
		IsVerified: user.IsVerified,
	}
	if user.StudentSubtype != "" {
		st := user.StudentSubtype
		ur.StudentSubtype = &st
	}
	m := user.Major
	gy := user.GraduationYear
	ur.Major = &m
	ur.GraduationYear = &gy

	respond.OK(w, map[string]any{"token": token, "user": ur})
}
