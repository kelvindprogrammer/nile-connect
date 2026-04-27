package database

import (
	"time"

	"gorm.io/gorm"
)

// Message — direct messages between users
type Message struct {
	ID         string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
	SenderID   string         `gorm:"not null;index"`
	ReceiverID string         `gorm:"not null;index"`
	Content    string         `gorm:"type:text;not null"`
	IsRead     bool           `gorm:"default:false"`
}

// Connection — connection requests between users
type Connection struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	RequesterID string         `gorm:"not null;index"`
	ReceiverID  string         `gorm:"not null;index"`
	Status      string         `gorm:"type:text;default:pending"` // pending | accepted | declined
	Note        string         `gorm:"type:text"`
}

// PasswordReset — tokens for password reset flow
type PasswordReset struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CreatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	UserID    string         `gorm:"not null;index"`
	Token     string         `gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time      `gorm:"not null"`
	Used      bool           `gorm:"default:false"`
}
