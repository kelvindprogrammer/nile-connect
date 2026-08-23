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

	// Extended profile — previously held only in browser localStorage, which
	// meant it never followed the user across devices and seeded every account
	// with the same placeholder bio/links (making Profile Strength read 100%
	// for a brand-new, empty profile). These columns are the source of truth.
	Bio       string `gorm:"type:text"`
	Location  string `gorm:"type:text"`
	Phone     string `gorm:"type:text"`
	LinkedIn  string `gorm:"type:text"`
	Portfolio string `gorm:"type:text"`
	GitHub    string `gorm:"type:text"`
	// Skills is a JSON array of strings; Experiences a JSON array of
	// {id,title,company,duration,description} objects. Stored as TEXT to keep
	// the simple-protocol GORM driver happy.
	Skills      string `gorm:"type:text"`
	Experiences string `gorm:"type:text"`
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

	// SuggestedBy is set when a student proposes an event rather than a staff
	// member or employer creating it directly. Such events stay in `pending`
	// until staff publish or cancel them, at which point the reviewer is
	// recorded here.
	SuggestedBy string `gorm:"type:text;index"`
	ReviewedBy  string `gorm:"type:text"`
	ReviewedAt  *time.Time
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
	// Kind: see lib/posts for the full vocabulary.
	JobID *string `gorm:"type:text;index"`
	Kind  string  `gorm:"type:text;default:'text'"`

	// ── Social layer (see lib/models/social.go for the surrounding domain) ──

	// Audience gates who may read the post. Enforced server-side by
	// lib/privacy on every read path, never by the client.
	// everyone | connections | close_friends | only_me | group
	Audience string `gorm:"type:text;default:'everyone';index"`

	// GroupID scopes the post to a Group. When set, Audience is "group" and
	// group membership — not the author's follower graph — decides visibility.
	GroupID *string `gorm:"type:text;index"`

	// RepostOfID is a bare repost (no commentary): the client renders the
	// original post inline and this row carries no content of its own.
	// QuoteOfID is a quote post: this row's Content is the commentary and the
	// quoted post renders as an embedded card. Exactly one may be set.
	RepostOfID *string `gorm:"type:text;index"`
	QuoteOfID  *string `gorm:"type:text;index"`

	// PollID attaches an interactive poll.
	PollID *string `gorm:"type:text;index"`

	// LinkURL powers link-preview posts.
	LinkURL         string `gorm:"type:text"`
	LinkTitle       string `gorm:"type:text"`
	LinkDescription string `gorm:"type:text"`
	LinkImageURL    string `gorm:"type:text"`

	// Denormalised counters. Maintained by the service layer and always
	// recomputed from their source rows rather than blindly incremented, so
	// they cannot drift (the same discipline used for event registrations).
	RepostsCount   int `gorm:"default:0"`
	QuotesCount    int `gorm:"default:0"`
	ReactionsCount int `gorm:"default:0"`
	SharesCount    int `gorm:"default:0"`
	// MediaCount lets the feed decide on a carousel layout without joining
	// post_media for every row.
	MediaCount int `gorm:"default:0"`

	// EditedAt is nil until the author edits, then drives an "edited" label.
	EditedAt *time.Time

	// Moderation state. Hidden content stays in the table (so reports remain
	// reviewable) but is filtered out of every read path.
	ModerationStatus string `gorm:"type:text;default:'active';index"` // active | hidden | removed
	// HotScore is the cached feed-ranking score; see lib/feedrank.
	HotScore float64 `gorm:"default:0;index"`
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

	// GroupKey collapses related notifications into one tray row ("Ada and 4
	// others reacted to your post") instead of five. Notifications sharing a
	// key inside the batching window are merged rather than appended — the
	// primary defence against notification spam.
	GroupKey string `gorm:"type:text;index"`
	// ActorCount is the number of distinct actors merged into this row.
	ActorCount int `gorm:"default:1"`
	// SubjectType/SubjectID power deep-linking, and let a notification be
	// invalidated when its subject is deleted.
	SubjectType string `gorm:"type:text;index"`
	SubjectID   string `gorm:"type:text;index"`
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

	// ParentID threads a reply under another comment. One level of nesting is
	// enforced in the service layer: a reply to a reply re-parents to the
	// top-level comment, which keeps rendering flat and predictable instead of
	// producing arbitrarily deep unreadable chains.
	ParentID *string `gorm:"type:text;index"`

	RepliesCount   int `gorm:"default:0"`
	ReactionsCount int `gorm:"default:0"`

	EditedAt         *time.Time
	ModerationStatus string `gorm:"type:text;default:'active';index"` // active | hidden | removed
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
