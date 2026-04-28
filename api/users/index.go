package handler

import (
	"net/http"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "search":
		searchUsers(w, r, auth)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

type userProfile struct {
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	Username       string  `json:"username"`
	Role           string  `json:"role"`
	StudentSubtype string  `json:"student_subtype,omitempty"`
	Major          string  `json:"major,omitempty"`
	GraduationYear int     `json:"graduation_year,omitempty"`
	IsVerified     bool    `json:"is_verified"`
}

// GET /api/users?path=search&q=...&role=...
func searchUsers(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	q := r.URL.Query().Get("q")
	role := r.URL.Query().Get("role")

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	query := database.Model(&models.User{}).
		Where("id != ? AND deleted_at IS NULL", auth.UserID)

	if q != "" {
		like := "%" + q + "%"
		query = query.Where("full_name ILIKE ? OR username ILIKE ? OR email ILIKE ?", like, like, like)
	}
	if role != "" && role != "all" {
		query = query.Where("role = ?", role)
	}

	var users []models.User
	query.Limit(50).Find(&users)

	result := make([]userProfile, 0, len(users))
	for _, u := range users {
		result = append(result, userProfile{
			ID:             u.ID,
			FullName:       u.FullName,
			Username:       u.Username,
			Role:           u.Role,
			StudentSubtype: u.StudentSubtype,
			Major:          u.Major,
			GraduationYear: u.GraduationYear,
			IsVerified:     u.IsVerified,
		})
	}
	respond.OK(w, map[string]any{"users": result})
}
