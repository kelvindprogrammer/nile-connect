package handler

import (
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type dashboardStats struct {
	TotalStudents     int64 `json:"total_students"`
	TotalEmployers    int64 `json:"total_employers"`
	PendingEmployers  int64 `json:"pending_employers"`
	ActiveJobs        int64 `json:"active_jobs"`
	PendingJobs       int64 `json:"pending_jobs"`
	TotalApplications int64 `json:"total_applications"`
	UpcomingEvents    int64 `json:"upcoming_events"`
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

	var stats dashboardStats
	database.Model(&models.User{}).Where("role = ? AND deleted_at IS NULL", "student").Count(&stats.TotalStudents)
	database.Model(&models.EmployerProfile{}).Where("deleted_at IS NULL").Count(&stats.TotalEmployers)
	database.Model(&models.EmployerProfile{}).Where("status = ? AND deleted_at IS NULL", "pending").Count(&stats.PendingEmployers)
	database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "active").Count(&stats.ActiveJobs)
	database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "pending").Count(&stats.PendingJobs)
	database.Model(&models.Application{}).Where("deleted_at IS NULL").Count(&stats.TotalApplications)
	database.Model(&models.Event{}).Where("date > ? AND deleted_at IS NULL", time.Now()).Count(&stats.UpcomingEvents)

	respond.OK(w, stats)
}
