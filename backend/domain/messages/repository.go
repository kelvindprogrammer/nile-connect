package messages

import (
	"time"

	"github.com/nile-connect/backend/internal/database"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Send(senderID, receiverID, content string) (*database.Message, error) {
	msg := &database.Message{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
	}
	if err := r.db.Create(msg).Error; err != nil {
		return nil, err
	}
	return msg, nil
}

func (r *Repository) GetThread(userA, userB string, limit int) ([]database.Message, error) {
	var msgs []database.Message
	err := r.db.
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			userA, userB, userB, userA).
		Order("created_at ASC").
		Limit(limit).
		Find(&msgs).Error
	return msgs, err
}

func (r *Repository) MarkRead(readerID, senderID string) error {
	return r.db.Model(&database.Message{}).
		Where("receiver_id = ? AND sender_id = ? AND is_read = false", readerID, senderID).
		Update("is_read", true).Error
}

// Conversations returns one row per conversation partner with the latest message.
func (r *Repository) GetConversations(userID string) ([]ConversationSummary, error) {
	type rawRow struct {
		OtherID    string
		FullName   string
		LastMsg    string
		LastTime   time.Time
		UnreadCnt  int64
	}

	query := `
SELECT
    partner_id                         AS other_id,
    u.full_name,
    MAX(m2.content)   FILTER (WHERE m2.created_at = MAX(m2.created_at) OVER (PARTITION BY partner_id)) AS last_msg,
    MAX(m2.created_at)                 AS last_time,
    COUNT(*) FILTER (WHERE m2.receiver_id = ? AND m2.is_read = false) AS unread_cnt
FROM (
    SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id,
           id
    FROM   messages
    WHERE  deleted_at IS NULL
      AND  (sender_id = ? OR receiver_id = ?)
) partners
JOIN messages m2 ON m2.id = partners.id
JOIN users u ON u.id = partners.partner_id
GROUP BY partner_id, u.full_name
ORDER BY last_time DESC
`
	// Simplified query that works on Postgres
	simpleQuery := `
SELECT DISTINCT ON (partner_id)
    partner_id AS other_id,
    u.full_name,
    m.content  AS last_msg,
    m.created_at AS last_time,
    (SELECT COUNT(*) FROM messages m3
     WHERE m3.receiver_id = $1 AND m3.sender_id = partner_id AND m3.is_read = false AND m3.deleted_at IS NULL
    ) AS unread_cnt
FROM (
    SELECT
        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
        id
    FROM messages
    WHERE deleted_at IS NULL AND (sender_id = $1 OR receiver_id = $1)
) parts
JOIN messages m ON m.id = parts.id
JOIN users u ON u.id = parts.partner_id AND u.deleted_at IS NULL
ORDER BY partner_id, m.created_at DESC
`
	_ = query

	rows, err := r.db.Raw(simpleQuery, userID).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ConversationSummary
	for rows.Next() {
		var row rawRow
		if err := rows.Scan(&row.OtherID, &row.FullName, &row.LastMsg, &row.LastTime, &row.UnreadCnt); err != nil {
			continue
		}
		result = append(result, ConversationSummary{
			UserID:   row.OtherID,
			FullName: row.FullName,
			LastMsg:  row.LastMsg,
			LastTime: row.LastTime,
			Unread:   int(row.UnreadCnt),
		})
	}
	return result, nil
}

// SearchUsers returns all users matching the query (for network/people search)
func (r *Repository) SearchUsers(currentUserID, query, role string, limit int) ([]UserProfile, error) {
	db := r.db.Model(&database.User{}).
		Where("id != ? AND deleted_at IS NULL", currentUserID)

	if query != "" {
		like := "%" + query + "%"
		db = db.Where("full_name ILIKE ? OR username ILIKE ? OR email ILIKE ?", like, like, like)
	}
	if role != "" && role != "all" {
		db = db.Where("role = ?", role)
	}

	var users []database.User
	if err := db.Limit(limit).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make([]UserProfile, len(users))
	for i, u := range users {
		subtype := ""
		if u.StudentSubtype != nil {
			subtype = string(*u.StudentSubtype)
		}
		result[i] = UserProfile{
			ID:             u.ID,
			FullName:       u.FullName,
			Username:       u.Username,
			Role:           string(u.Role),
			StudentSubtype: subtype,
			Major:          u.Major,
			GraduationYear: u.GraduationYear,
			IsVerified:     u.IsVerified,
		}
	}
	return result, nil
}
