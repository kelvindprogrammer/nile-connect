package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"nile-connect/lib/db"
	"nile-connect/lib/jwtutil"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"

	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
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

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		respond.Error(w, http.StatusBadRequest, "email and password are required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var user models.User
	if err := database.Where("email = ? AND deleted_at IS NULL", req.Email).First(&user).Error; err != nil {
		respond.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respond.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if user.Role == "employer" {
		var profile models.EmployerProfile
		if err := database.Where("user_id = ? AND deleted_at IS NULL", user.ID).First(&profile).Error; err != nil {
			respond.Error(w, http.StatusUnauthorized, "employer profile not found")
			return
		}
		if profile.Status != "approved" {
			respond.Error(w, http.StatusForbidden, "your account is pending verification by staff")
			return
		}
	}

	token, err := jwtutil.Generate(user.ID, user.Role, user.StudentSubtype)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}

	ur := buildUserResponse(&user)
	respond.OK(w, map[string]any{"token": token, "user": ur})
}

func buildUserResponse(u *models.User) userResponse {
	ur := userResponse{
		ID:         u.ID,
		FullName:   u.FullName,
		Username:   u.Username,
		Email:      u.Email,
		Role:       u.Role,
		IsVerified: u.IsVerified,
	}
	if u.StudentSubtype != "" {
		st := u.StudentSubtype
		ur.StudentSubtype = &st
	}
	if u.Major != "" {
		m := u.Major
		ur.Major = &m
	}
	if u.GraduationYear != 0 {
		gy := u.GraduationYear
		ur.GraduationYear = &gy
	}
	return ur
}
