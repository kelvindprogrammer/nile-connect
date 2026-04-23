package application

import (
	"github.com/nile-connect/backend/internal/database"
	"gorm.io/gorm"
)

// Repository implements ApplicationRepository interface
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateApplication(application *database.Application) error {
	return r.db.Create(application).Error
}

func (r *Repository) FindApplicationByID(applicationID string) (*database.Application, error) {
	var application database.Application
	err := r.db.Preload("Job").Preload("Job.EmployerProfile").Where("id = ?", applicationID).First(&application).Error
	return &application, err
}

func (r *Repository) DeleteApplication(applicationID string) error {
	return r.db.Where("id = ?", applicationID).Delete(&database.Application{}).Error
}

func (r *Repository) HasApplied(studentID, jobID string) (bool, error) {
	var count int64
	err := r.db.Model(&database.Application{}).Where("student_id = ? AND job_id = ?", studentID, jobID).Count(&count).Error
	return count > 0, err
}

func (r *Repository) GetStudentApplications(studentID string) ([]database.Application, error) {
	var applications []database.Application
	err := r.db.Preload("Job").Preload("Job.EmployerProfile").Where("student_id = ?", studentID).Find(&applications).Error
	return applications, err
}

func (r *Repository) GetApplicationStatistics(jobID string) (*ApplicationStatistics, error) {
	stats := &ApplicationStatistics{}

	// Total applications
	err := r.db.Model(&database.Application{}).Where("job_id = ?", jobID).Count(&stats.Total).Error
	if err != nil {
		return nil, err
	}

	// Applications by status
	err = r.db.Model(&database.Application{}).Where("job_id = ? AND status = ?", jobID, database.ApplicationStatusApplied).Count(&stats.Applied).Error
	if err != nil {
		return nil, err
	}

	err = r.db.Model(&database.Application{}).Where("job_id = ? AND status = ?", jobID, database.ApplicationStatusInterview).Count(&stats.UnderReview).Error
	if err != nil {
		return nil, err
	}

	err = r.db.Model(&database.Application{}).Where("job_id = ? AND status = ?", jobID, database.ApplicationStatusInterview).Count(&stats.Interview).Error
	if err != nil {
		return nil, err
	}

	err = r.db.Model(&database.Application{}).Where("job_id = ? AND status = ?", jobID, database.ApplicationStatusOffer).Count(&stats.Offered).Error
	if err != nil {
		return nil, err
	}

	err = r.db.Model(&database.Application{}).Where("job_id = ? AND status = ?", jobID, database.ApplicationStatusRejected).Count(&stats.Rejected).Error
	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *Repository) UpdateApplicationStatus(applicationID string, status database.ApplicationStatus) error {
	return r.db.Model(&database.Application{}).Where("id = ?", applicationID).Update("status", status).Error
}
