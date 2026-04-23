package job

import (
	"github.com/nile-connect/backend/internal/database"
	"gorm.io/gorm"
)

// JobRepository defines the interface for job data operations
type JobRepository interface {
	// Job operations
	FindActiveJobs(filters *JobFilters) ([]database.Job, error)
	SearchJobs(query string, filters *JobFilters) ([]database.Job, error)
	FindByID(jobID string) (*database.Job, error)
	JobExists(jobID string) (bool, error)
	GetJobStatistics(jobID string) (*JobStatistics, error)

	// Saved jobs operations
	SaveJob(studentID, jobID string) error
	UnsaveJob(studentID, jobID string) error
	GetSavedJobs(studentID string) ([]database.Job, error)
	IsJobSaved(studentID, jobID string) (bool, error)
}

// Repository implements JobRepository interface
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindActiveJobs(filters *JobFilters) ([]database.Job, error) {
	var jobs []database.Job
	err := r.db.Model(&database.Job{}).
		Preload("EmployerProfile").
		Where("status = ?", database.JobStatusActive).
		Find(&jobs).Error
	return jobs, err
}

func (r *Repository) SearchJobs(query string, filters *JobFilters) ([]database.Job, error) {
	var jobs []database.Job
	db := r.db.Model(&database.Job{}).
		Preload("EmployerProfile").
		Where("status = ?", database.JobStatusActive)

	if query != "" {
		db = db.Where("title ILIKE ? OR description ILIKE ? OR requirements ILIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%")
	}

	err := db.Find(&jobs).Error
	return jobs, err
}

func (r *Repository) FindByID(jobID string) (*database.Job, error) {
	var job database.Job
	err := r.db.Preload("EmployerProfile").Where("id = ?", jobID).First(&job).Error
	return &job, err
}

func (r *Repository) JobExists(jobID string) (bool, error) {
	var count int64
	err := r.db.Model(&database.Job{}).Where("id = ?", jobID).Count(&count).Error
	return count > 0, err
}

func (r *Repository) GetJobStatistics(jobID string) (*JobStatistics, error) {
	var totalApps int64
	err := r.db.Model(&database.Application{}).Where("job_id = ?", jobID).Count(&totalApps).Error
	if err != nil {
		return nil, err
	}

	stats := &JobStatistics{
		TotalApplicants: int(totalApps),
		PendingReview:   0, // Simplified for now
		InterviewStage:  0,
		OffersExtended:  0,
		Rejected:        0,
	}

	return stats, nil
}



func (r *Repository) SaveJob(studentID, jobID string) error {
	// Note: This would use a SavedJobs model in a full implementation
	// For now, returning nil as placeholder
	return nil
}

func (r *Repository) UnsaveJob(studentID, jobID string) error {
	// Note: This would use a SavedJobs model in a full implementation
	// For now, returning nil as placeholder
	return nil
}

func (r *Repository) GetSavedJobs(studentID string) ([]database.Job, error) {
	// Note: This would use a SavedJobs model with joins in a full implementation
	// For now, returning empty list as placeholder
	return []database.Job{}, nil
}

func (r *Repository) IsJobSaved(studentID, jobID string) (bool, error) {
	// Note: This would use a SavedJobs model in a full implementation
	// For now, returning false as placeholder
	return false, nil
}
