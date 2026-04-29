package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

// Handler handles all /api/messages/* routes
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "conversations":
		getConversations(w, r, auth)
	case "thread":
		getThread(w, r, auth)
	case "send":
		sendMessage(w, r, auth)
	case "users-search":
		searchUsers(w, r, auth)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

type msgResp struct {
	ID         string    `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

type convSummary struct {
	UserID   string    `json:"user_id"`
	FullName string    `json:"full_name"`
	LastMsg  string    `json:"last_msg"`
	LastTime time.Time `json:"last_time"`
	Unread   int       `json:"unread"`
}

func toMsgResp(m *models.Message) msgResp {
	return msgResp{
		ID:         m.ID,
		SenderID:   m.SenderID,
		ReceiverID: m.ReceiverID,
		Content:    m.Content,
		IsRead:     m.IsRead,
		CreatedAt:  m.CreatedAt,
	}
}

// GET /api/messages?path=conversations
func getConversations(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type row struct {
		PartnerID string
		FullName  string
		LastMsg   string
		LastTime  time.Time
		Unread    int
	}

	var rows []row
	database.Raw(`
		SELECT DISTINCT ON (partner_id)
			partner_id,
			u.full_name,
			m.content AS last_msg,
			m.created_at AS last_time,
			(SELECT COUNT(*) FROM messages m3
			 WHERE m3.receiver_id = ? AND m3.sender_id = partner_id AND m3.is_read = false AND m3.deleted_at IS NULL
			) AS unread
		FROM (
			SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id, id
			FROM messages
			WHERE deleted_at IS NULL AND (sender_id = ? OR receiver_id = ?)
		) parts
		JOIN messages m ON m.id = parts.id
		JOIN users u ON u.id = parts.partner_id AND u.deleted_at IS NULL
		ORDER BY partner_id, m.created_at DESC
	`, auth.UserID, auth.UserID, auth.UserID, auth.UserID).Scan(&rows)

	result := make([]convSummary, 0, len(rows))
	for _, r := range rows {
		result = append(result, convSummary{
			UserID:   r.PartnerID,
			FullName: r.FullName,
			LastMsg:  r.LastMsg,
			LastTime: r.LastTime,
			Unread:   r.Unread,
		})
	}
	respond.OK(w, map[string]any{"conversations": result})
}

// GET /api/messages?path=thread&toId=<userId>
func getThread(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	toID := r.URL.Query().Get("toId")
	if toID == "" {
		respond.Error(w, http.StatusBadRequest, "toId is required")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var msgs []models.Message
	database.
		Where("deleted_at IS NULL AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))",
			auth.UserID, toID, toID, auth.UserID).
		Order("created_at ASC").
		Limit(100).
		Find(&msgs)

	// Mark incoming as read
	database.Model(&models.Message{}).
		Where("receiver_id = ? AND sender_id = ? AND is_read = false", auth.UserID, toID).
		Update("is_read", true)

	result := make([]msgResp, len(msgs))
	for i, m := range msgs {
		result[i] = toMsgResp(&m)
	}
	respond.OK(w, map[string]any{"messages": result})
}

// POST /api/messages?path=send&toId=<userId>
func sendMessage(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	toID := r.URL.Query().Get("toId")
	if toID == "" {
		respond.Error(w, http.StatusBadRequest, "toId is required")
		return
	}
	if toID == auth.UserID {
		respond.Error(w, http.StatusBadRequest, "cannot message yourself")
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		respond.Error(w, http.StatusBadRequest, "content is required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	msg := models.Message{
		SenderID:   auth.UserID,
		ReceiverID: toID,
		Content:    req.Content,
	}
	if err := database.Create(&msg).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not send message")
		return
	}
	respond.Created(w, toMsgResp(&msg))
}

// GET /api/messages?path=users-search&q=...&role=...
func searchUsers(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	q := r.URL.Query().Get("q")
	role := r.URL.Query().Get("role")

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type userProfile struct {
		ID             string `json:"id"`
		FullName       string `json:"full_name"`
		Username       string `json:"username"`
		Role           string `json:"role"`
		StudentSubtype string `json:"student_subtype,omitempty"`
		Major          string `json:"major,omitempty"`
		GraduationYear int    `json:"graduation_year,omitempty"`
		IsVerified     bool   `json:"is_verified"`
	}

	query := database.Model(&models.User{}).Where("id != ? AND deleted_at IS NULL", auth.UserID)
	if q != "" {
		like := "%" + q + "%"
		query = query.Where("full_name ILIKE ? OR username ILIKE ? OR email ILIKE ?", like, like, like)
	}
	if role != "" && role != "all" {
		query = query.Where("role = ?", role)
	}

	var users []models.User
	query.Limit(50).Find(&users)

	result := make([]userProfile, 0, len(users))
	for _, u := range users {
		result = append(result, userProfile{
			ID:             u.ID,
			FullName:       u.FullName,
			Username:       u.Username,
			Role:           u.Role,
			StudentSubtype: u.StudentSubtype,
			Major:          u.Major,
			GraduationYear: u.GraduationYear,
			IsVerified:     u.IsVerified,
		})
	}
	respond.OK(w, map[string]any{"users": result})
}
