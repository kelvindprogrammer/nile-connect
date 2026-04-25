package handler

import (
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type studentSummary struct {
	ID             string    `json:"id"`
	FullName       string    `json:"full_name"`
	Email          string    `json:"email"`
	Major          string    `json:"major"`
	GraduationYear int       `json:"graduation_year"`
	IsVerified     bool      `json:"is_verified"`
	CreatedAt      time.Time `json:"created_at"`
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
	if auth.Role != "staff" {
		respond.Error(w, http.StatusForbidden, "staff access required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var users []models.User
	if err := database.Where("role = ? AND deleted_at IS NULL", "student").Order("created_at desc").Find(&users).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not fetch students")
		return
	}

	result := make([]studentSummary, 0, len(users))
	for _, u := range users {
		result = append(result, studentSummary{
			ID:             u.ID,
			FullName:       u.FullName,
			Email:          u.Email,
			Major:          u.Major,
			GraduationYear: u.GraduationYear,
			IsVerified:     u.IsVerified,
			CreatedAt:      u.CreatedAt,
		})
	}

	respond.OK(w, map[string]any{"students": result})
}
