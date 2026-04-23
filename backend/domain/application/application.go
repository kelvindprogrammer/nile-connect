package application

import (
	"time"

	"github.com/nile-connect/backend/internal/database"
)

// Application represents a job application
type Application struct {
	ID          string                     `json:"id"`
	JobID       string                     `json:"job_id"`
	StudentID   string                     `json:"student_id"`
	CoverLetter string                     `json:"cover_letter"`
	Status      database.ApplicationStatus `json:"status"`
	AppliedAt   *time.Time                 `json:"applied_at"`
	UpdatedAt   *time.Time                 `json:"updated_at"`
	Job         *database.Job              `json:"job,omitempty"`
}

// ApplicationFilters defines filters for querying applications
type ApplicationFilters struct {
	Status    *database.ApplicationStatus `json:"status"`
	JobID     *string                     `json:"job_id"`
	StudentID *string                     `json:"student_id"`
	Page      int                         `json:"page"`
	Limit     int                         `json:"limit"`
}

// ApplicationStatistics contains statistics about applications
type ApplicationStatistics struct {
	Total       int64 `json:"total"`
	Applied     int64 `json:"applied"`
	UnderReview int64 `json:"under_review"`
	Interview   int64 `json:"interview"`
	Offered     int64 `json:"offered"`
	Rejected    int64 `json:"rejected"`
}

// NewApplication creates a new application instance
func NewApplication(jobID, studentID, coverLetter string) *Application {
	now := time.Now()
	return &Application{
		ID:          "app-" + time.Now().Format("20060102150405"),
		JobID:       jobID,
		StudentID:   studentID,
		CoverLetter: coverLetter,
		Status:      database.ApplicationStatusApplied,
		AppliedAt:   &now,
		UpdatedAt:   &now,
	}
}
