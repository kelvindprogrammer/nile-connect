package database

import (
	"time"

	"gorm.io/gorm"
)

// Role values
type Role string

const (
	RoleStudent  Role = "student"
	RoleStaff    Role = "staff"
	RoleEmployer Role = "employer"
)

// StudentSubtype values
type StudentSubtype string

const (
	StudentSubtypeCurrent StudentSubtype = "current"
	StudentSubtypeAlumni  StudentSubtype = "alumni"
)

type User struct {
	ID             string          `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt  `gorm:"index"`
	FullName       string          `gorm:"not null"`
	Username       string          `gorm:"uniqueIndex;not null"`
	Email          string          `gorm:"uniqueIndex;not null"`
	PasswordHash   string          `gorm:"not null"`
	Role           Role            `gorm:"type:text;not null"`
	StudentSubtype *StudentSubtype `gorm:"type:text"`
	Major          string
	GraduationYear int
	IsVerified     bool            `gorm:"default:false"`
}

// EmployerStatus values
type EmployerStatus string

const (
	EmployerStatusPending  EmployerStatus = "pending"
	EmployerStatusApproved EmployerStatus = "approved"
	EmployerStatusRejected EmployerStatus = "rejected"
)

type EmployerProfile struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	UserID       string         `gorm:"not null;index"`
	CompanyName  string         `gorm:"not null"`
	Industry     string         `gorm:"not null"`
	Location     string         `gorm:"not null"`
	About        string         `gorm:"type:text"`
	ContactEmail string         `gorm:"not null"`
	Website      string
	LinkedIn     string
	Status       EmployerStatus `gorm:"type:text;default:pending"`
}

// JobType values
type JobType string

const (
	JobTypeInternship JobType = "internship"
	JobTypeFullTime   JobType = "full-time"
	JobTypePartTime   JobType = "part-time"
	JobTypeRemote     JobType = "remote"
	JobTypeHybrid     JobType = "hybrid"
)

// JobStatus values
type JobStatus string

const (
	JobStatusPending  JobStatus = "pending"
	JobStatusActive   JobStatus = "active"
	JobStatusRejected JobStatus = "rejected"
	JobStatusArchived JobStatus = "archived"
)

type Job struct {
	ID             string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt `gorm:"index"`
	EmployerID     string         `gorm:"not null;index"`
	Title          string         `gorm:"not null"`
	Type           JobType        `gorm:"type:text;not null"`
	Location       string         `gorm:"not null"`
	Salary         string
	Description    string         `gorm:"type:text;not null"`
	Requirements   string         `gorm:"type:text;not null"`
	Deadline       time.Time
	Skills         string         `gorm:"type:text"`
	Status         JobStatus      `gorm:"type:text;default:pending"`
	ApplicantCount int            `gorm:"default:0"`
}

// ApplicationStatus values
type ApplicationStatus string

const (
	ApplicationStatusSaved     ApplicationStatus = "saved"
	ApplicationStatusApplied   ApplicationStatus = "applied"
	ApplicationStatusInterview ApplicationStatus = "interview"
	ApplicationStatusOffer     ApplicationStatus = "offer"
	ApplicationStatusRejected  ApplicationStatus = "rejected"
)

type Application struct {
	ID        string            `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt    `gorm:"index"`
	JobID     string            `gorm:"not null;index"`
	StudentID string            `gorm:"not null;index"`
	Status    ApplicationStatus `gorm:"type:text;default:saved"`
	AppliedAt *time.Time
}

// EventCategory values
type EventCategory string

const (
	EventCategoryTech     EventCategory = "tech"
	EventCategoryWorkshop EventCategory = "workshop"
	EventCategoryFair     EventCategory = "fair"
	EventCategoryWebinar  EventCategory = "webinar"
)
