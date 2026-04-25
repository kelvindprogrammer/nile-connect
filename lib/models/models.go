package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID             string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt `gorm:"index"`
	FullName       string         `gorm:"not null"`
	Username       string         `gorm:"uniqueIndex;not null"`
	Email          string         `gorm:"uniqueIndex;not null"`
	PasswordHash   string         `gorm:"not null"`
	Role           string         `gorm:"type:text;not null"`
	StudentSubtype string         `gorm:"type:text"`
	Major          string
	GraduationYear int
	IsVerified     bool           `gorm:"default:false"`
}

type EmployerProfile struct {
	ID           string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
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
	Status       string         `gorm:"type:text;default:'pending'"`
}

type Job struct {
	ID             string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt `gorm:"index"`
	EmployerID     string         `gorm:"not null;index"`
	Title          string         `gorm:"not null"`
	Type           string         `gorm:"type:text;not null"`
	Location       string         `gorm:"not null"`
	Salary         string
	Description    string         `gorm:"type:text;not null"`
	Requirements   string         `gorm:"type:text;not null"`
	Deadline       time.Time
	Skills         string         `gorm:"type:text"`
	Status         string         `gorm:"type:text;default:'pending'"`
	ApplicantCount int            `gorm:"default:0"`
}

type Application struct {
	ID        string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	JobID     string         `gorm:"not null;index"`
	StudentID string         `gorm:"not null;index"`
	Status    string         `gorm:"type:text;default:'applied'"`
	AppliedAt *time.Time
}

type Event struct {
	ID                 string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
	DeletedAt          gorm.DeletedAt `gorm:"index"`
	OrganiserID        string         `gorm:"not null;index"`
	OrganiserType      string         `gorm:"type:text;not null"`
	Title              string         `gorm:"not null"`
	Category           string         `gorm:"type:text;not null"`
	Date               time.Time      `gorm:"not null"`
	Time               string         `gorm:"not null"`
	Location           string         `gorm:"not null"`
	Description        string         `gorm:"type:text;not null"`
	Capacity           int            `gorm:"not null"`
	RegistrationsCount int            `gorm:"default:0"`
	AttendanceCount    int            `gorm:"default:0"`
	IsFeatured         bool           `gorm:"default:false"`
	Status             string         `gorm:"type:text;default:'pending'"`
}

type EventRegistration struct {
	ID           string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	EventID      string         `gorm:"not null;index"`
	StudentID    string         `gorm:"not null;index"`
	RegisteredAt time.Time
}

type Post struct {
	ID            string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
	AuthorID      string         `gorm:"not null;index"`
	AuthorType    string         `gorm:"type:text;not null"`
	Content       string         `gorm:"type:text;not null"`
	MediaUrl      string
	LikesCount    int            `gorm:"default:0"`
	CommentsCount int            `gorm:"default:0"`
}

type PostLike struct {
	ID        string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	PostID    string         `gorm:"not null;index"`
	UserID    string         `gorm:"not null;index"`
}
