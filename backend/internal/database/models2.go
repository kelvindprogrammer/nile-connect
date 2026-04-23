package database

import (
	"time"

	"gorm.io/gorm"
)

type Event struct {
	ID                 string        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
	DeletedAt          gorm.DeletedAt `gorm:"index"`
	OrganiserID        string         `gorm:"not null;index"`
	OrganiserType      Role           `gorm:"type:role;not null"`
	Title              string         `gorm:"not null"`
	Category           EventCategory  `gorm:"type:event_category;not null"`
	Date               time.Time      `gorm:"not null"`
	Time               string         `gorm:"not null"`
	Location           string         `gorm:"not null"`
	Description        string         `gorm:"type:text;not null"`
	Capacity           int            `gorm:"not null"`
	RegistrationsCount int            `gorm:"default:0"`
	AttendanceCount    int            `gorm:"default:0"`
	IsFeatured         bool           `gorm:"default:false"`
	Status             JobStatus      `gorm:"type:job_status;default:pending"`
}

type EventRegistration struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	EventID      string         `gorm:"not null;index"`
	StudentID    string         `gorm:"not null;index"`
	RegisteredAt time.Time
}

type Post struct {
	ID            string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
	AuthorID      string         `gorm:"not null;index"`
	AuthorType    Role           `gorm:"type:role;not null"`
	Content       string         `gorm:"type:text;not null"`
	MediaUrl      string
	LikesCount    int            `gorm:"default:0"`
	CommentsCount int            `gorm:"default:0"`
}

type PostLike struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	PostID    string         `gorm:"not null;index"`
	UserID    string         `gorm:"not null;index"`
}

type CVDocument struct {
	ID               string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        gorm.DeletedAt `gorm:"index"`
	StudentID        string         `gorm:"not null;index"`
	FileUrl          string         `gorm:"not null"`
	OriginalFilename string         `gorm:"not null"`
	AnalysisResult   string         `gorm:"type:json"`
	UploadedAt       time.Time
}

type AdvisorSlot struct {
	ID             string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt `gorm:"index"`
	AdvisorName    string         `gorm:"not null"`
	Speciality     string         `gorm:"not null"`
	Rating         float64
	AvailableTimes string         `gorm:"type:json"`
}

type ReportType string

const (
	ReportTypeWeekly  ReportType = "weekly"
	ReportTypeMonthly ReportType = "monthly"
)

type Report struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	StaffID     string         `gorm:"not null;index"`
	Type        ReportType     `gorm:"type:report_type;not null"`
	GeneratedAt time.Time
	FileUrl     string
}

func (ReportType) GormDataType() string { return "report_type" }
