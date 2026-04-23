package database

import (
	"time"

	"gorm.io/gorm"
)

// ... continued from models.go

type Event struct {
	gorm.Model
	ID                  string       `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	OrganiserID         string       `gorm:"not null;index"`
	OrganiserType       Role         `gorm:"type:role;not null"` // staff or employer
	Title               string       `gorm:"not null"`
	Category            EventCategory `gorm:"type:event_category;not null"`
	Date                time.Time    `gorm:"not null"`
	Time                string       `gorm:"not null"`
	Location            string       `gorm:"not null"`
	Description         string       `gorm:"type:text;not null"`
	Capacity            int          `gorm:"not null"`
	RegistrationsCount  int          `gorm:"default:0"`
	AttendanceCount     int          `gorm:"default:0"`
	IsFeatured          bool         `gorm:"default:false"`
	Status              JobStatus    `gorm:"type:job_status;default:pending"`
	CreatedAt           time.Time
}

type EventRegistration struct {
	gorm.Model
	ID          string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	EventID     string `gorm:"not null;index"`
	StudentID   string `gorm:"not null;index"`
	RegisteredAt time.Time
}

type Post struct {
	gorm.Model
	ID            string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	AuthorID      string `gorm:"not null;index"`
	AuthorType    Role   `gorm:"type:role;not null"` // student, employer, or staff
	Content       string `gorm:"type:text;not null"`
	MediaUrl      string
	LikesCount    int    `gorm:"default:0"`
	CommentsCount int    `gorm:"default:0"`
	CreatedAt     time.Time
}

type PostLike struct {
	gorm.Model
	ID     string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	PostID string `gorm:"not null;index"`
	UserID string `gorm:"not null;index"`
}

type CVDocument struct {
	gorm.Model
	ID               string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	StudentID        string `gorm:"not null;index"`
	FileUrl          string `gorm:"not null"`
	OriginalFilename string `gorm:"not null"`
	AnalysisResult   string `gorm:"type:json"` // JSON from AI analysis
	UploadedAt       time.Time
}

type AdvisorSlot struct {
	gorm.Model
	ID             string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	AdvisorName    string `gorm:"not null"`
	Speciality     string `gorm:"not null"`
	Rating         float64
	AvailableTimes string `gorm:"type:json"` // JSON array of available times
	CreatedAt      time.Time
}

type ReportType string

const (
	ReportTypeWeekly  ReportType = "weekly"
	ReportTypeMonthly ReportType = "monthly"
)

type Report struct {
	gorm.Model
	ID            string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	StaffID       string     `gorm:"not null;index"`
	Type          ReportType `gorm:"type:report_type;not null"`
	GeneratedAt   time.Time
	FileUrl       string
}

// Custom types implementation
func (ReportType) GormDataType() string { return "report_type" }