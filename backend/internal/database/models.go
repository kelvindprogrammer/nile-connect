package database

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleStudent  Role = "student"
	RoleStaff    Role = "staff"
	RoleEmployer Role = "employer"
)

type StudentSubtype string

const (
	StudentSubtypeCurrent StudentSubtype = "current"
	StudentSubtypeAlumni  StudentSubtype = "alumni"
)

type User struct {
	gorm.Model
	ID              string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	FullName        string         `gorm:"not null"`
	Username        string         `gorm:"uniqueIndex;not null"`
	Email           string         `gorm:"uniqueIndex;not null"`
	PasswordHash    string         `gorm:"not null"`
	Role            Role           `gorm:"type:role;not null"`
	StudentSubtype  *StudentSubtype `gorm:"type:student_subtype"`
	Major           string
	GraduationYear  int
	IsVerified      bool           `gorm:"default:false"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type EmployerStatus string

const (
	EmployerStatusPending  EmployerStatus = "pending"
	EmployerStatusApproved EmployerStatus = "approved"
	EmployerStatusRejected EmployerStatus = "rejected"
)

type EmployerProfile struct {
	gorm.Model
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID       string         `gorm:"not null;index"`
	CompanyName  string         `gorm:"not null"`
	Industry     string         `gorm:"not null"`
	Location     string         `gorm:"not null"`
	About        string         `gorm:"type:text"`
	ContactEmail string         `gorm:"not null"`
	Website      string
	LinkedIn     string
	Status       EmployerStatus `gorm:"type:employer_status;default:pending"`
	CreatedAt    time.Time
}

type JobType string

const (
	JobTypeInternship JobType = "internship"
	JobTypeFullTime   JobType = "full-time"
	JobTypePartTime   JobType = "part-time"
	JobTypeRemote     JobType = "remote"
	JobTypeHybrid     JobType = "hybrid"
)

type JobStatus string

const (
	JobStatusPending  JobStatus = "pending"
	JobStatusActive   JobStatus = "active"
	JobStatusRejected JobStatus = "rejected"
	JobStatusArchived JobStatus = "archived"
)

type Job struct {
	gorm.Model
	ID              string   `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	EmployerID      string   `gorm:"not null;index"`
	Title           string   `gorm:"not null"`
	Type            JobType  `gorm:"type:job_type;not null"`
	Location        string   `gorm:"not null"`
	Salary          string
	Description     string   `gorm:"type:text;not null"`
	Requirements    string   `gorm:"type:text;not null"`
	Deadline        time.Time
	Skills          string   `gorm:"type:text"` // JSON array stored as string
	Status          JobStatus `gorm:"type:job_status;default:pending"`
	ApplicantCount  int      `gorm:"default:0"`
	CreatedAt       time.Time
}

type ApplicationStatus string

const (
	ApplicationStatusSaved     ApplicationStatus = "saved"
	ApplicationStatusApplied   ApplicationStatus = "applied"
	ApplicationStatusInterview ApplicationStatus = "interview"
	ApplicationStatusOffer     ApplicationStatus = "offer"
	ApplicationStatusRejected  ApplicationStatus = "rejected"
)

type Application struct {
	gorm.Model
	ID          string            `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	JobID       string            `gorm:"not null;index"`
	StudentID   string            `gorm:"not null;index"`
	Status      ApplicationStatus `gorm:"type:application_status;default:saved"`
	AppliedAt   *time.Time
	UpdatedAt   time.Time
}

type EventCategory string

const (
	EventCategoryTech     EventCategory = "tech"
	EventCategoryWorkshop EventCategory = "workshop"
	EventCategoryFair     EventCategory = "fair"
	EventCategoryWebinar  EventCategory = "webinar"
)

// Define custom types for the database
func (Role) GormDataType() string               { return "role" }
func (StudentSubtype) GormDataType() string     { return "student_subtype" }
func (EmployerStatus) GormDataType() string     { return "employer_status" }
func (JobType) GormDataType() string            { return "job_type" }
func (JobStatus) GormDataType() string          { return "job_status" }
func (ApplicationStatus) GormDataType() string  { return "application_status" }
func (EventCategory) GormDataType() string      { return "event_category" }