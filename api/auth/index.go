package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/jwtutil"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"

	"golang.org/x/crypto/bcrypt"
)

// Handler is the single entrypoint for all /api/auth/* routes.
// The vercel.json rewrites pass the sub-path as ?path=<value>.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	switch r.URL.Query().Get("path") {
	case "login":
		login(w, r)
	case "register-student":
		registerStudent(w, r)
	case "register-employer":
		registerEmployer(w, r)
	case "complete-profile":
		completeProfile(w, r)
	case "forgot-password":
		forgotPassword(w, r)
	case "reset-password":
		resetPassword(w, r)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── shared response type ──────────────────────────────────────────────────────

type userResp struct {
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

func buildUserResp(u *models.User) userResp {
	resp := userResp{
		ID:         u.ID,
		FullName:   u.FullName,
		Username:   u.Username,
		Email:      u.Email,
		Role:       u.Role,
		IsVerified: u.IsVerified,
	}
	if u.StudentSubtype != "" {
		st := u.StudentSubtype
		resp.StudentSubtype = &st
	}
	if u.Major != "" {
		m := u.Major
		resp.Major = &m
	}
	if u.GraduationYear != 0 {
		gy := u.GraduationYear
		resp.GraduationYear = &gy
	}
	return resp
}

func tokenResponse(u *models.User) (map[string]any, error) {
	token, err := jwtutil.Generate(u.ID, u.Role, u.StudentSubtype)
	if err != nil {
		return nil, err
	}
	return map[string]any{"token": token, "user": buildUserResp(u)}, nil
}

// ── login ─────────────────────────────────────────────────────────────────────

func login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
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

	body, err := tokenResponse(&user)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}
	respond.OK(w, body)
}

// ── register student ──────────────────────────────────────────────────────────

func registerStudent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		FullName string `json:"full_name"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = strings.TrimSpace(req.Username)
	if req.FullName == "" || req.Username == "" || req.Email == "" || req.Password == "" {
		respond.Error(w, http.StatusBadRequest, "all fields are required")
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
	database.Model(&models.User{}).
		Where("(email = ? OR username = ?) AND deleted_at IS NULL", req.Email, req.Username).
		Count(&count)
	if count > 0 {
		respond.Error(w, http.StatusConflict, "email or username already exists")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	subtype := "alumni"
	if isEduEmail(req.Email) {
		subtype = "current"
	}
	user := models.User{
		FullName:       req.FullName,
		Username:       req.Username,
		Email:          req.Email,
		PasswordHash:   string(hash),
		Role:           "student",
		StudentSubtype: subtype,
		IsVerified:     true,
	}
	if err := database.Create(&user).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create user")
		return
	}

	body, err := tokenResponse(&user)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}
	respond.Created(w, body)
}

// ── register employer ─────────────────────────────────────────────────────────

func registerEmployer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
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
	database.Model(&models.User{}).
		Where("(email = ? OR username = ?) AND deleted_at IS NULL", req.Email, req.Username).
		Count(&count)
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

	body, err := tokenResponse(&user)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}
	body["message"] = "Account created. Awaiting staff verification before you can log in."
	respond.Created(w, body)
}

// ── complete profile ──────────────────────────────────────────────────────────

func completeProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		UserID         string `json:"user_id"`
		Major          string `json:"major"`
		GraduationYear int    `json:"graduation_year"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.UserID == "" || req.Major == "" || req.GraduationYear == 0 {
		respond.Error(w, http.StatusBadRequest, "user_id, major and graduation_year are required")
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

	body, err := tokenResponse(&user)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}
	respond.OK(w, body)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// ── forgot password ───────────────────────────────────────────────────────────

func forgotPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		respond.Error(w, http.StatusBadRequest, "email is required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var user models.User
	if err := database.Where("email = ? AND deleted_at IS NULL", strings.ToLower(req.Email)).First(&user).Error; err != nil {
		// Don't reveal whether email exists
		respond.OK(w, map[string]any{"message": "If that email is registered, a reset link has been sent."})
		return
	}

	// Generate a secure token
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not generate token")
		return
	}
	token := hex.EncodeToString(b)

	// Invalidate previous tokens for this user
	database.Model(&models.PasswordReset{}).Where("user_id = ? AND used = false", user.ID).Update("used", true)

	reset := models.PasswordReset{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	database.Create(&reset)

	// In production: send token via email. For demo, return in response.
	respond.OK(w, map[string]any{
		"message": "Reset token generated. In production this would be emailed.",
		"token":   token,
	})
}

// ── reset password ────────────────────────────────────────────────────────────

func resetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		respond.Error(w, http.StatusBadRequest, "token and new_password are required")
		return
	}
	if len(req.NewPassword) < 8 {
		respond.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var reset models.PasswordReset
	if err := database.Where("token = ? AND used = false AND expires_at > NOW() AND deleted_at IS NULL", req.Token).First(&reset).Error; err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid or expired reset token")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	database.Model(&models.User{}).Where("id = ?", reset.UserID).Update("password_hash", string(hash))
	database.Model(&models.PasswordReset{}).Where("token = ?", req.Token).Update("used", true)

	respond.OK(w, map[string]any{"message": "Password reset successfully"})
}

func isEduEmail(email string) bool {
	lower := strings.ToLower(email)
	return strings.HasSuffix(lower, ".edu") || strings.HasSuffix(lower, ".edu.ng")
}
