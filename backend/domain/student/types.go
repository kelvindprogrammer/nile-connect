package student

import (
	"time"
)

type Student struct {
	ID             string    `json:"id"`
	FullName       string    `json:"full_name"`
	Username       string    `json:"username"`
	Email          string    `json:"email"`
	StudentSubtype string    `json:"student_subtype"` // current, alumni
	Major          string    `json:"major"`
	GraduationYear int       `json:"graduation_year"`
	GPA            float64   `json:"gpa,omitempty"`
	Skills         []string  `json:"skills,omitempty"`
	Interests      []string  `json:"interests,omitempty"`
	ProfilePicURL  string    `json:"profile_pic_url,omitempty"`
	IsVerified     bool      `json:"is_verified"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ProfileUpdateRequest struct {
	FullName       string   `json:"full_name" validate:"omitempty,min=2"`
	Major          string   `json:"major" validate:"omitempty"`
	GraduationYear int      `json:"graduation_year" validate:"omitempty,min=2023,max=2030"`
	GPA            float64  `json:"gpa" validate:"omitempty,min=0,max=4.0"`
	Skills         []string `json:"skills" validate:"omitempty"`
	Interests      []string `json:"interests" validate:"omitempty"`
}

type CVUploadRequest struct {
	Filename string `json:"filename" validate:"required"`
	Content  []byte `json:"content" validate:"required"`
}

type CVUploadResponse struct {
	CVId     string `json:"cv_id"`
	Filename string `json:"filename"`
	URL      string `json:"url"`
}

type JobApplicationRequest struct {
	JobID     string `json:"job_id" validate:"required"`
	CoverLetter string `json:"cover_letter" validate:"omitempty,max=2000"`
}

type JobApplicationResponse struct {
	ApplicationID string    `json:"application_id"`
	JobTitle      string    `json:"job_title"`
	Status        string    `json:"status"`
	AppliedAt     time.Time `json:"applied_at"`
}

type JobSearchResponse struct {
	JobID          string    `json:"job_id"`
	Title          string    `json:"title"`
	Company        string    `json:"company"`
	Location       string    `json:"location"`
	Type           string    `json:"type"`
	Description    string    `json:"description"`
	Requirements   []string  `json:"requirements"`
	PostedAt       time.Time `json:"posted_at"`
	ApplicationDeadline *time.Time `json:"application_deadline,omitempty"`
}

// Service interface
type StudentService interface {
	GetProfile(userID string) (*Student, error)
	UpdateProfile(userID string, req *ProfileUpdateRequest) (*Student, error)
	UploadCV(userID string, req *CVUploadRequest) (*CVUploadResponse, error)
	GetCV(userID string, cvID string) (*CVUploadResponse, error)
	DeleteCV(userID string, cvID string) error
	ApplyToJob(userID string, req *JobApplicationRequest) (*JobApplicationResponse, error)
	GetApplications(userID string) ([]JobApplicationResponse, error)
	SearchJobs(query string, filters map[string]interface{}) ([]JobSearchResponse, error)
}

// Repository interface
type StudentRepository interface {
	FindByID(id string) (*Student, error)
	UpdateProfile(id string, updates map[string]interface{}) error
	SaveCV(userID string, cvData CVUploadRequest) (string, error)
	GetCV(userID string, cvID string) (*CVUploadRequest, error)
	DeleteCV(userID string, cvID string) error
	CreateJobApplication(userID, jobID, coverLetter string) (string, error)
	GetUserApplications(userID string) ([]JobApplicationResponse, error)
	FindJobs(query string, filters map[string]interface{}) ([]JobSearchResponse, error)
}