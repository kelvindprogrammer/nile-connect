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
	// PasswordHash is empty for Campus One SSO users.
	PasswordHash   string         `gorm:"type:text"`
	Role           string         `gorm:"type:text;not null"`
	StudentSubtype string         `gorm:"type:text"`
	Major          string
	GraduationYear int
	IsVerified     bool           `gorm:"default:false"`

	// Campus One identity fields — populated on first OIDC login.
	CampusOneSub string `gorm:"type:text;index"` // stable `sub` from id_token
	StudentID    string `gorm:"type:text"`        // e.g. "21/0542"
	StudyLevel   string `gorm:"type:text"`        // "undergraduate" | "postgraduate"
	Level        int                               // 100, 200, 300, 400, 500
	FacultyID    string `gorm:"type:text"`        // "fac_eng"
	DepartmentID string `gorm:"type:text"`        // "dept_cs"

	// Presence — updated by the messaging heartbeat endpoint.
	LastActiveAt *time.Time

	// ResumeURL points to the student's uploaded CV/resume (Vercel Blob).
	ResumeURL string `gorm:"type:text"`
}

type EmployerProfile struct {
	ID           string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	UserID       string         `gorm:"not null;index"`
	CompanyName  string         `gorm:"type:text"`
	Industry     string         `gorm:"type:text"`
	Location     string         `gorm:"type:text"`
	About        string         `gorm:"type:text"`
	ContactEmail string         `gorm:"type:text"`
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
	ID          string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	JobID       string         `gorm:"not null;index"`
	StudentID   string         `gorm:"not null;index"`
	Status      string         `gorm:"type:text;default:'applied'"`
	AppliedAt   *time.Time
	CoverLetter string         `gorm:"type:text"`
	ResumeURL   string         `gorm:"type:text"`
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

type Message struct {
	ID         string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
	SenderID   string         `gorm:"not null;index"`
	ReceiverID string         `gorm:"not null;index"`
	Content    string         `gorm:"type:text;not null"`
	IsRead     bool           `gorm:"default:false"`
	MediaURL   string         `gorm:"type:text"`
	MediaType  string         `gorm:"type:text"` // "image" | "file"
}

type PasswordReset struct {
	ID        string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	UserID    string         `gorm:"not null;index"`
	Token     string         `gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time      `gorm:"not null"`
	Used      bool           `gorm:"default:false"`
}

type Notification struct {
	ID        string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	UserID    string         `gorm:"not null;index"` // recipient
	ActorID   string         `gorm:"type:text;index"` // who triggered it
	Type      string         `gorm:"type:text;not null"` // message|like|comment|connection_request|connection_accept|application_status|event
	Title     string         `gorm:"type:text;not null"`
	Body      string         `gorm:"type:text"`
	Link      string         `gorm:"type:text"`
	IsRead    bool           `gorm:"default:false"`
}

type Comment struct {
	ID         string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
	PostID     string         `gorm:"not null;index"`
	AuthorID   string         `gorm:"not null;index"`
	AuthorType string         `gorm:"type:text;not null"`
	Content    string         `gorm:"type:text;not null"`
}

type Connection struct {
	ID          string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	RequesterID string         `gorm:"not null;index"`
	RecipientID string         `gorm:"not null;index"`
	Status      string         `gorm:"type:text;default:'pending'"` // pending|accepted|declined
}

type TypingStatus struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	UpdatedAt time.Time
	UserID    string `gorm:"not null;uniqueIndex:idx_typing_pair"`
	PartnerID string `gorm:"not null;uniqueIndex:idx_typing_pair"`
}

// ServiceRequest represents a student's request for a career service
// (mock interview, career advisory, or CV review) handled by staff.
type ServiceRequest struct {
	ID          string         `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	StudentID   string         `gorm:"not null;index"`
	StaffID     string         `gorm:"type:text;index"`
	Type        string         `gorm:"type:text;not null"`          // mock_interview | career_advisory | cv_review
	Status      string         `gorm:"type:text;default:'pending'"` // pending|scheduled|completed|declined
	Notes       string         `gorm:"type:text"`
	Feedback    string         `gorm:"type:text"`
	ScheduledAt *time.Time
	RoomID      string `gorm:"type:text"`
}
