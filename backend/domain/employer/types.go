package employer

import (
	"time"

	"github.com/nile-connect/backend/internal/database"
)

type Employer struct {
	ID            string    `json:"id"`
	FullName      string    `json:"full_name"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	IsVerified    bool      `json:"is_verified"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	CompanyName   string    `json:"company_name"`
	Industry      string    `json:"industry"`
	Location      string    `json:"location"`
	About         string    `json:"about"`
	ContactEmail  string    `json:"contact_email"`
	Website       string    `json:"website,omitempty"`
	Status        string    `json:"status"`
}

type JobPostRequest struct {
	Title               string     `json:"title" validate:"required,min=5,max=200"`
	Description         string     `json:"description" validate:"required,min=50,max=5000"`
	Requirements        []string   `json:"requirements" validate:"required,min=1"`
	Location           string     `json:"location" validate:"required"`
	Type               string     `json:"type" validate:"required,oneof=full-time part-time contract internship"`
	Industry           string     `json:"industry" validate:"required"`
	SalaryRangeMin     *float64   `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *float64   `json:"salary_range_max,omitempty"`
	ApplicationDeadline *time.Time `json:"application_deadline,omitempty"`
}

type JobPostResponse struct {
	ID                  string     `json:"id"`
	Title               string     `json:"title"`
	CompanyName         string     `json:"company_name"`
	Location           string     `json:"location"`
	Type               string     `json:"type"`
	Industry           string     `json:"industry"`
	Status             string     `json:"status"`
	PostedAt           time.Time  `json:"posted_at"`
	ApplicationCount   int        `json:"application_count"`
}

type JobApplicationResponse struct {
	ApplicationID string    `json:"application_id"`
	JobTitle      string    `json:"job_title"`
	ApplicantName string    `json:"applicant_name"`
	ApplicantEmail string   `json:"applicant_email"`
	Status        string    `json:"status"`
	CoverLetter   string    `json:"cover_letter"`
	AppliedAt     time.Time `json:"applied_at"`
	CVURL        string    `json:"cv_url,omitempty"`
}

type ProfileUpdateRequest struct {
	CompanyName  string `json:"company_name" validate:"omitempty,min=2"`
	Industry     string `json:"industry" validate:"omitempty"`
	Location     string `json:"location" validate:"omitempty"`
	About        string `json:"about" validate:"omitempty,min=10,max=2000"`
	ContactEmail string `json:"contact_email" validate:"omitempty,email"`
	Website      string `json:"website" validate:"omitempty,url"`
}

type UpdateJobRequest struct {
	Title               string     `json:"title" validate:"omitempty,min=5,max=200"`
	Description         string     `json:"description" validate:"omitempty,min=50,max=5000"`
	Requirements        []string   `json:"requirements" validate:"omitempty"`
	Location           string     `json:"location" validate:"omitempty"`
	Type               string     `json:"type" validate:"omitempty,oneof=full-time part-time contract internship"`
	Industry           string     `json:"industry" validate:"omitempty"`
	SalaryRangeMin     *float64   `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *float64   `json:"salary_range_max,omitempty"`
	ApplicationDeadline *time.Time `json:"application_deadline,omitempty"`
	Status             string     `json:"status" validate:"omitempty,oneof=active paused closed"`
}

// Service interface
type EmployerService interface {
	GetProfile(userID string) (*Employer, error)
	UpdateProfile(userID string, req *ProfileUpdateRequest) (*Employer, error)
	PostJob(userID string, req *JobPostRequest) (*JobPostResponse, error)
	GetEmployerJobs(employerID string) ([]JobPostResponse, error)
	GetJobDetails(jobID string) (*JobPostResponse, error)
	UpdateJob(employerID string, jobID string, req *UpdateJobRequest) (*JobPostResponse, error)
	DeleteJob(employerID string, jobID string) error
	GetJobApplications(employerID string, jobID string) ([]JobApplicationResponse, error)
	UpdateApplicationStatus(employerID string, applicationID string, status string) (*JobApplicationResponse, error)
}

// Repository interface
type EmployerRepository interface {
	FindByID(id string) (*Employer, error)
	UpdateProfile(id string, updates map[string]interface{}) error
	CreateJob(job *database.Job) error
	GetJobsByEmployer(employerID string) ([]database.Job, error)
	GetJobByID(jobID string) (*database.Job, error)
	GetApplicationsForJob(jobID string) ([]database.Application, error)
	UpdateApplicationStatus(applicationID string, status database.ApplicationStatus) error
}