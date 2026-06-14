package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"gorm.io/gorm"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/notify"
	"nile-connect/lib/respond"
)

// Handler handles all /api/messages/* routes plus the related
// notifications, connections, presence, typing and upload endpoints —
// all bundled here to stay within the Vercel Hobby function limit.
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

	case "notifications":
		notifications(w, r, auth)
	case "notifications-unread-count":
		notificationsUnreadCount(w, r, auth)
	case "notifications-read":
		notificationRead(w, r, auth)
	case "notifications-mark-all-read":
		notificationsMarkAllRead(w, r, auth)

	case "connections":
		getConnections(w, r, auth)
	case "connections-request":
		connectionsRequest(w, r, auth)
	case "connections-respond":
		connectionsRespond(w, r, auth)

	case "presence":
		presenceHeartbeat(w, r, auth)
	case "presence-status":
		presenceStatus(w, r, auth)
	case "typing":
		setTyping(w, r, auth)
	case "upload":
		uploadFile(w, r, auth)

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
	MediaURL   string    `json:"media_url,omitempty"`
	MediaType  string    `json:"media_type,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type convSummary struct {
	UserID       string     `json:"user_id"`
	FullName     string     `json:"full_name"`
	LastMsg      string     `json:"last_msg"`
	LastTime     time.Time  `json:"last_time"`
	Unread       int        `json:"unread"`
	LastActiveAt *time.Time `json:"last_active_at,omitempty"`
}

func toMsgResp(m *models.Message) msgResp {
	return msgResp{
		ID:         m.ID,
		SenderID:   m.SenderID,
		ReceiverID: m.ReceiverID,
		Content:    m.Content,
		IsRead:     m.IsRead,
		MediaURL:   m.MediaURL,
		MediaType:  m.MediaType,
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
		PartnerID    string
		FullName     string
		LastActiveAt *time.Time
		LastMsg      string
		LastTime     time.Time
		Unread       int
	}

	var rows []row
	database.Raw(`
		SELECT DISTINCT ON (partner_id)
			partner_id,
			u.full_name,
			u.last_active_at,
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
			UserID:       r.PartnerID,
			FullName:     r.FullName,
			LastMsg:      r.LastMsg,
			LastTime:     r.LastTime,
			Unread:       r.Unread,
			LastActiveAt: r.LastActiveAt,
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

	// Is the partner currently typing to us?
	var typingCount int64
	database.Model(&models.TypingStatus{}).
		Where("user_id = ? AND partner_id = ? AND updated_at > ?", toID, auth.UserID, time.Now().Add(-5*time.Second)).
		Count(&typingCount)

	result := make([]msgResp, len(msgs))
	for i, m := range msgs {
		result[i] = toMsgResp(&m)
	}
	respond.OK(w, map[string]any{"messages": result, "partner_typing": typingCount > 0})
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
		Content   string `json:"content"`
		MediaURL  string `json:"media_url"`
		MediaType string `json:"media_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Content == "" && req.MediaURL == "" {
		respond.Error(w, http.StatusBadRequest, "content or media is required")
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
		MediaURL:   req.MediaURL,
		MediaType:  req.MediaType,
	}
	if err := database.Create(&msg).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not send message")
		return
	}

	var sender models.User
	if database.Where("id = ?", auth.UserID).First(&sender).Error == nil {
		preview := req.Content
		if preview == "" {
			preview = "Sent an attachment"
		}
		notify.Create(database, toID, auth.UserID, "message",
			fmt.Sprintf("New message from %s", sender.FullName),
			notify.Truncate(preview, 80),
			"/messages")
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
		ID             string     `json:"id"`
		FullName       string     `json:"full_name"`
		Username       string     `json:"username"`
		Role           string     `json:"role"`
		StudentSubtype string     `json:"student_subtype,omitempty"`
		Major          string     `json:"major,omitempty"`
		GraduationYear int        `json:"graduation_year,omitempty"`
		IsVerified     bool       `json:"is_verified"`
		LastActiveAt   *time.Time `json:"last_active_at,omitempty"`
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
			LastActiveAt:   u.LastActiveAt,
		})
	}
	respond.OK(w, map[string]any{"users": result})
}

type notificationResp struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Link      string    `json:"link"`
	IsRead    bool      `json:"is_read"`
	ActorID   string    `json:"actor_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func toNotificationResp(n *models.Notification) notificationResp {
	return notificationResp{
		ID:        n.ID,
		Type:      n.Type,
		Title:     n.Title,
		Body:      n.Body,
		Link:      n.Link,
		IsRead:    n.IsRead,
		ActorID:   n.ActorID,
		CreatedAt: n.CreatedAt,
	}
}

// GET /api/messages?path=notifications
func notifications(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var rows []models.Notification
	database.Where("user_id = ?", auth.UserID).Order("created_at desc").Limit(50).Find(&rows)

	result := make([]notificationResp, len(rows))
	for i, n := range rows {
		result[i] = toNotificationResp(&n)
	}
	respond.OK(w, map[string]any{"notifications": result})
}

// GET /api/messages?path=notifications-unread-count
func notificationsUnreadCount(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var count int64
	database.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", auth.UserID).
		Count(&count)

	respond.OK(w, map[string]any{"count": count})
}

// POST /api/messages?path=notifications-read&id=<notificationId>
func notificationRead(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	database.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, auth.UserID).
		Update("is_read", true)

	respond.OK(w, map[string]any{"success": true})
}

// POST /api/messages?path=notifications-mark-all-read
func notificationsMarkAllRead(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	database.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", auth.UserID).
		Update("is_read", true)

	respond.OK(w, map[string]any{"success": true})
}

type connRespItem struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// GET /api/messages?path=connections
func getConnections(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type connRow struct {
		ID          string
		OtherUserID string
		FullName    string
		Role        string
		Status      string
		Direction   string
		CreatedAt   time.Time
	}

	var rows []connRow
	if err := database.Raw(`
		SELECT
			c.id,
			CASE WHEN c.requester_id = ? THEN c.recipient_id ELSE c.requester_id END AS other_user_id,
			u.full_name,
			u.role,
			c.status,
			CASE WHEN c.requester_id = ? THEN 'outgoing' ELSE 'incoming' END AS direction,
			c.created_at
		FROM connections c
		JOIN users u ON u.id = (CASE WHEN c.requester_id = ? THEN c.recipient_id ELSE c.requester_id END) AND u.deleted_at IS NULL
		WHERE c.deleted_at IS NULL AND (c.requester_id = ? OR c.recipient_id = ?)
		ORDER BY c.created_at DESC
	`, auth.UserID, auth.UserID, auth.UserID, auth.UserID, auth.UserID).Scan(&rows).Error; err != nil {
		log.Printf("connections: query failed: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not load connections")
		return
	}

	accepted := []connRespItem{}
	incoming := []connRespItem{}
	outgoing := []connRespItem{}

	for _, row := range rows {
		item := connRespItem{
			ID:        row.ID,
			UserID:    row.OtherUserID,
			FullName:  row.FullName,
			Role:      row.Role,
			Status:    row.Status,
			CreatedAt: row.CreatedAt,
		}
		switch {
		case row.Status == "accepted":
			accepted = append(accepted, item)
		case row.Status == "pending" && row.Direction == "incoming":
			incoming = append(incoming, item)
		case row.Status == "pending" && row.Direction == "outgoing":
			outgoing = append(outgoing, item)
		}
	}

	respond.OK(w, map[string]any{"accepted": accepted, "incoming": incoming, "outgoing": outgoing})
}

// POST /api/messages?path=connections-request&toId=<userId>
func connectionsRequest(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
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
		respond.Error(w, http.StatusBadRequest, "cannot connect with yourself")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var existing models.Connection
	err = database.Where(`deleted_at IS NULL AND status IN ('pending', 'accepted') AND
		((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))`,
		auth.UserID, toID, toID, auth.UserID).First(&existing).Error
	if err == nil {
		respond.Error(w, http.StatusConflict, "connection already exists")
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("connections-request: lookup failed: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not create connection request")
		return
	}

	conn := models.Connection{RequesterID: auth.UserID, RecipientID: toID, Status: "pending"}
	if err := database.Create(&conn).Error; err != nil {
		log.Printf("connections-request: create failed: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not create connection request")
		return
	}

	var actor models.User
	if database.Where("id = ?", auth.UserID).First(&actor).Error == nil {
		notify.Create(database, toID, auth.UserID, "connection_request",
			"New connection request",
			fmt.Sprintf("%s wants to connect with you", actor.FullName),
			"/network")
	}

	respond.Created(w, connRespItem{ID: conn.ID, UserID: toID, Status: conn.Status, CreatedAt: conn.CreatedAt})
}

// POST /api/messages?path=connections-respond&id=<connectionId>&action=accept|decline
func connectionsRespond(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	action := r.URL.Query().Get("action")
	if action == "" {
		var body struct {
			Action string `json:"action"`
		}
		json.NewDecoder(r.Body).Decode(&body)
		action = body.Action
	}
	if id == "" || (action != "accept" && action != "decline") {
		respond.Error(w, http.StatusBadRequest, "id and a valid action are required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var conn models.Connection
	if err := database.Where("id = ? AND recipient_id = ? AND status = 'pending' AND deleted_at IS NULL", id, auth.UserID).First(&conn).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("connections-respond: lookup failed: %v", err)
		}
		respond.Error(w, http.StatusNotFound, "connection request not found")
		return
	}

	status := "declined"
	if action == "accept" {
		status = "accepted"
	}
	database.Model(&conn).Update("status", status)

	if status == "accepted" {
		var actor models.User
		if database.Where("id = ?", auth.UserID).First(&actor).Error == nil {
			notify.Create(database, conn.RequesterID, auth.UserID, "connection_accept",
				"Connection accepted",
				fmt.Sprintf("%s accepted your connection request", actor.FullName),
				"/network")
		}
	}

	respond.OK(w, map[string]any{"id": conn.ID, "status": status})
}

// POST /api/messages?path=presence — heartbeat, called periodically while the app is open.
func presenceHeartbeat(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	database.Model(&models.User{}).Where("id = ?", auth.UserID).Update("last_active_at", time.Now())
	respond.OK(w, map[string]any{"success": true})
}

// GET /api/messages?path=presence-status&userId=<userId>
func presenceStatus(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		respond.Error(w, http.StatusBadRequest, "userId is required")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var user models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "user not found")
		return
	}

	respond.OK(w, map[string]any{"user_id": user.ID, "last_active_at": user.LastActiveAt})
}

// POST /api/messages?path=typing&toId=<userId>
func setTyping(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
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

	database.Exec(`
		INSERT INTO typing_statuses (user_id, partner_id, updated_at)
		VALUES (?, ?, now())
		ON CONFLICT (user_id, partner_id) DO UPDATE SET updated_at = now()
	`, auth.UserID, toID)

	respond.OK(w, map[string]any{"success": true})
}

const blobAPIBase = "https://blob.vercel-storage.com"

// POST /api/messages?path=upload — multipart/form-data, field "file".
// Streams the file to Vercel Blob and returns its public URL.
func uploadFile(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	token := os.Getenv("BLOB_READ_WRITE_TOKEN")
	if token == "" {
		respond.Error(w, http.StatusServiceUnavailable, "file uploads are not configured")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid upload (max 10MB)")
		return
	}
	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	pathname := fmt.Sprintf("uploads/%s/%d-%s", auth.UserID, time.Now().UnixNano(), sanitizeFilename(fileHeader.Filename))

	req, err := http.NewRequest(http.MethodPut, blobAPIBase+"/"+pathname, file)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "upload failed")
		return
	}
	req.ContentLength = fileHeader.Size
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("x-content-type", contentType)
	req.Header.Set("x-api-version", "7")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		respond.Error(w, http.StatusBadGateway, "upload failed")
		return
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 300 {
		respond.Error(w, http.StatusBadGateway, "upload failed: "+string(respBody))
		return
	}

	var blobResp struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(respBody, &blobResp); err != nil || blobResp.URL == "" {
		respond.Error(w, http.StatusBadGateway, "upload failed")
		return
	}

	mediaType := "file"
	if strings.HasPrefix(contentType, "image/") {
		mediaType = "image"
	}

	respond.OK(w, map[string]any{
		"url":          blobResp.URL,
		"media_type":   mediaType,
		"content_type": contentType,
		"filename":     fileHeader.Filename,
	})
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, " ", "-")
	var b strings.Builder
	for _, ch := range name {
		switch {
		case ch >= 'a' && ch <= 'z', ch >= 'A' && ch <= 'Z', ch >= '0' && ch <= '9', ch == '.', ch == '-', ch == '_':
			b.WriteRune(ch)
		}
	}
	if b.Len() == 0 {
		return "file"
	}
	return b.String()
}
