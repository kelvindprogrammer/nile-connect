package messages

import "time"

type SendMessageRequest struct {
	Content string `json:"content"`
}

type MessageResponse struct {
	ID         string    `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

type ConversationSummary struct {
	UserID   string    `json:"user_id"`
	FullName string    `json:"full_name"`
	LastMsg  string    `json:"last_msg"`
	LastTime time.Time `json:"last_time"`
	Unread   int       `json:"unread"`
}

type UserProfile struct {
	ID             string `json:"id"`
	FullName       string `json:"full_name"`
	Username       string `json:"username"`
	Role           string `json:"role"`
	StudentSubtype string `json:"student_subtype,omitempty"`
	Major          string `json:"major,omitempty"`
	GraduationYear int    `json:"graduation_year,omitempty"`
	IsVerified     bool   `json:"is_verified"`
}
