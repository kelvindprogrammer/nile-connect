package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	FullName  string         `gorm:"not null"`
	Username  string         `gorm:"uniqueIndex;not null"`
	Email     string         `gorm:"uniqueIndex;not null"`
	// PasswordHash is empty for Campus One SSO users.
	PasswordHash   string `gorm:"type:text"`
	Role           string `gorm:"type:text;not null"`
	StudentSubtype string `gorm:"type:text"`
	Major          string
	GraduationYear int
	GPA            float64 `gorm:"default:0"`
	IsVerified     bool    `gorm:"default:false"`

	// Campus One identity fields — populated on first OIDC login.
	CampusOneSub string `gorm:"type:text;index"` // stable `sub` from id_token
	StudentID    string `gorm:"type:text"`       // e.g. "21/0542"
	StudyLevel   string `gorm:"type:text"`       // "undergraduate" | "postgraduate"
	Level        int    // 100, 200, 300, 400, 500
	FacultyID    string `gorm:"type:text"` // "fac_eng"
	DepartmentID string `gorm:"type:text"` // "dept_cs"

	// Presence — updated by the messaging heartbeat endpoint.
	LastActiveAt *time.Time

	// ResumeURL points to the student's uploaded CV/resume (Vercel Blob).
	ResumeURL string `gorm:"type:text"`
}

type EmployerProfile struct {
	ID           string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
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
	Status       string `gorm:"type:text;default:'pending'"`
	LogoURL      string `gorm:"type:text"`
	CompanySize  string `gorm:"type:text"` // "1-10"|"11-50"|"51-200"|"201-500"|"500+"
	Headquarters string `gorm:"type:text"`
	IsVerified   bool   `gorm:"default:false"` // verification badge, independent of Status
	FoundedYear  int
}

type Job struct {
	ID             string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt `gorm:"index"`
	EmployerID     string         `gorm:"not null;index"`
	Title          string         `gorm:"not null"`
	Type           string         `gorm:"type:text;not null"`
	Location       string         `gorm:"not null"`
	Salary         string
	Description    string `gorm:"type:text;not null"`
	Requirements   string `gorm:"type:text;not null"`
	Deadline       time.Time
	Skills         string `gorm:"type:text"`
	Status         string `gorm:"type:text;default:'pending'"`
	ApplicantCount int    `gorm:"default:0"`

	// EmploymentCategory: internship|siwes|nyse|graduate|full-time|part-time|contract.
	// Kept separate from Type to avoid breaking existing filters.
	EmploymentCategory string `gorm:"type:text"`
	IsRemote           bool   `gorm:"default:false"`
	RequiredDocs       string `gorm:"type:text"` // JSON array of Document.Type
	OptionalDocs       string `gorm:"type:text"` // JSON array of Document.Type
	ApprovedBy         string `gorm:"type:text"`
	ApprovedAt         *time.Time
	RejectionReason    string `gorm:"type:text"`
}

type Application struct {
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	JobID       string         `gorm:"not null;index"`
	StudentID   string         `gorm:"not null;index"`
	Status      string         `gorm:"type:text;default:'applied'"`
	AppliedAt   *time.Time
	CoverLetter string `gorm:"type:text"`
	ResumeURL   string `gorm:"type:text"`

	// Stage is the rich pipeline status; Status (above) is kept in sync via
	// stageToLegacyStatus() so existing readers of Status keep working.
	Stage       string `gorm:"type:text;default:'submitted'"`
	StageOrder  int    `gorm:"default:0"`
	DocumentIDs string `gorm:"type:text"` // JSON array of Document.ID selected for this application
	WithdrawnAt *time.Time
}

// ApplicationStageHistory records every stage transition for an application,
// forming the audit trail shown to employers and students.
type ApplicationStageHistory struct {
	ID            string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt     time.Time
	ApplicationID string `gorm:"not null;index"`
	FromStage     string `gorm:"type:text"`
	ToStage       string `gorm:"type:text;not null"`
	ChangedBy     string `gorm:"type:text;not null"`
	Note          string `gorm:"type:text"`
}

// ApplicationNote holds an employer's private note + rating on an
// application. One row per (ApplicationID, AuthorID), upserted.
type ApplicationNote struct {
	ID            string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	ApplicationID string `gorm:"not null;index"`
	AuthorID      string `gorm:"not null;index"`
	Body          string `gorm:"type:text"`
	Rating        int    `gorm:"default:0"` // 0-5, 0 = unrated
}

// Document is a reusable file a student attaches to applications:
// resume|cover_letter|reference_letter|transcript|siwes_letter|certification|portfolio.
type Document struct {
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	UserID      string         `gorm:"not null;index"`
	Type        string         `gorm:"type:text;not null"`
	Title       string         `gorm:"type:text;not null"`
	FileURL     string         `gorm:"type:text;not null"`
	FileName    string         `gorm:"type:text"`
	RefereeType string         `gorm:"type:text"` // "academic"|"professional" — reference_letter only
	ExpiresAt   *time.Time
	IsDefault   bool `gorm:"default:false"`
}

// EmailVerification tracks a one-time token used to confirm an employer's
// contact email before their profile reaches staff review.
type EmailVerification struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UserID     string `gorm:"not null;index"`
	Token      string `gorm:"uniqueIndex;not null"`
	ExpiresAt  time.Time
	VerifiedAt *time.Time
}

type Event struct {
	ID                 string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
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
	ID           string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	EventID      string         `gorm:"not null;index"`
	StudentID    string         `gorm:"not null;index"`
	RegisteredAt time.Time
}

type Post struct {
	ID            string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
	AuthorID      string         `gorm:"not null;index"`
	AuthorType    string         `gorm:"type:text;not null"`
	Content       string         `gorm:"type:text;not null"`
	MediaUrl      string
	LikesCount    int `gorm:"default:0"`
	CommentsCount int `gorm:"default:0"`

	// JobID links a "job share" post to the live Job it references.
	// Kind: text|job|achievement|announcement.
	JobID *string `gorm:"type:text;index"`
	Kind  string  `gorm:"type:text;default:'text'"`
}

// ProfileView records a debounced visit to a user's profile, powering a
// "profile views" count. The API layer debounces repeat writes within a
// short window per (viewer, subject) pair rather than the DB.
type ProfileView struct {
	ID            string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt     time.Time
	ViewerID      string `gorm:"not null;index"`
	ProfileUserID string `gorm:"not null;index"`
}

// Endorsement is one user vouching for another's named skill.
type Endorsement struct {
	ID            string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt     time.Time
	EndorserID    string `gorm:"not null;index"`
	ProfileUserID string `gorm:"not null;index"`
	Skill         string `gorm:"type:text;not null"`
}

type PostLike struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	PostID    string         `gorm:"not null;index"`
	UserID    string         `gorm:"not null;index"`
}

type Message struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
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
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	UserID    string         `gorm:"not null;index"`
	Token     string         `gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time      `gorm:"not null"`
	Used      bool           `gorm:"default:false"`
}

type Notification struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	UserID    string         `gorm:"not null;index"`     // recipient
	ActorID   string         `gorm:"type:text;index"`    // who triggered it
	Type      string         `gorm:"type:text;not null"` // message|like|comment|connection_request|connection_accept|application_status|event
	Title     string         `gorm:"type:text;not null"`
	Body      string         `gorm:"type:text"`
	Link      string         `gorm:"type:text"`
	IsRead    bool           `gorm:"default:false"`
}

type Comment struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
	PostID     string         `gorm:"not null;index"`
	AuthorID   string         `gorm:"not null;index"`
	AuthorType string         `gorm:"type:text;not null"`
	Content    string         `gorm:"type:text;not null"`
}

type Connection struct {
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
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
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
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
