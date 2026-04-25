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

type employerRegisterRequest struct {
	FullName     string `json:"full_name"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	CompanyName  string `json:"company_name"`
	Industry     string `json:"industry"`
	Location     string `json:"location"`
	About        string `json:"about"`
	ContactEmail string `json:"contact_email"`
	Website      string `json:"website"`
}

type userResponse struct {
	ID         string `json:"id"`
	FullName   string `json:"full_name"`
	Username   string `json:"username"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	IsVerified bool   `json:"is_verified"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req employerRegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = strings.TrimSpace(req.Username)
	if req.FullName == "" || req.Username == "" || req.Email == "" || req.Password == "" ||
		req.CompanyName == "" || req.Industry == "" || req.Location == "" || req.ContactEmail == "" {
		respond.Error(w, http.StatusBadRequest, "all required fields must be provided")
		return
	}
	if len(req.Password) < 8 {
		respond.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var count int64
	database.Model(&models.User{}).Where("(email = ? OR username = ?) AND deleted_at IS NULL", req.Email, req.Username).Count(&count)
	if count > 0 {
		respond.Error(w, http.StatusConflict, "email or username already exists")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user := models.User{
		FullName:     req.FullName,
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         "employer",
		IsVerified:   false,
	}
	if err := database.Create(&user).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create user")
		return
	}

	profile := models.EmployerProfile{
		UserID:       user.ID,
		CompanyName:  req.CompanyName,
		Industry:     req.Industry,
		Location:     req.Location,
		About:        req.About,
		ContactEmail: req.ContactEmail,
		Website:      req.Website,
		Status:       "pending",
	}
	if err := database.Create(&profile).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create employer profile")
		return
	}

	token, err := jwtutil.Generate(user.ID, user.Role, "")
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
	respond.Created(w, map[string]any{
		"token":   token,
		"user":    ur,
		"message": "Account created. Awaiting staff verification before you can log in.",
	})
}
