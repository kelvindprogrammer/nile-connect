package application

import "github.com/nile-connect/backend/internal/database"

// ApplicationRepository defines the interface for application data operations
type ApplicationRepository interface {
	// Application operations
	CreateApplication(application *database.Application) error
	FindApplicationByID(applicationID string) (*database.Application, error)
	DeleteApplication(applicationID string) error
	HasApplied(studentID, jobID string) (bool, error)
	GetStudentApplications(studentID string) ([]database.Application, error)
	GetApplicationStatistics(jobID string) (*ApplicationStatistics, error)
	UpdateApplicationStatus(applicationID string, status database.ApplicationStatus) error
}
