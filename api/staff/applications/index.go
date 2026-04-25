package handler

import (
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type applicationSummary struct {
	ID        string     `json:"id"`
	StudentID string     `json:"student_id"`
	Student   string     `json:"student_name"`
	JobID     string     `json:"job_id"`
	JobTitle  string     `json:"job_title"`
	Company   string     `json:"company"`
	Status    string     `json:"status"`
	AppliedAt *time.Time `json:"applied_at"`
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

	var apps []models.Application
	if err := database.Where("deleted_at IS NULL").Find(&apps).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not fetch applications")
		return
	}

	result := make([]applicationSummary, 0, len(apps))
	for _, a := range apps {
		sum := applicationSummary{
			ID:        a.ID,
			StudentID: a.StudentID,
			JobID:     a.JobID,
			Status:    a.Status,
			AppliedAt: a.AppliedAt,
		}
		var student models.User
		if database.Where("id = ?", a.StudentID).First(&student).Error == nil {
			sum.Student = student.FullName
		}
		var job models.Job
		if database.Where("id = ?", a.JobID).First(&job).Error == nil {
			sum.JobTitle = job.Title
			var emp models.EmployerProfile
			if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
				sum.Company = emp.CompanyName
			}
		}
		result = append(result, sum)
	}

	respond.OK(w, map[string]any{"applications": result})
}
