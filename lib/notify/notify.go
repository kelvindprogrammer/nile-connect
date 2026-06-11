// Package notify provides a small helper for creating in-app notifications
// from any API handler.
package notify

import (
	"gorm.io/gorm"

	"nile-connect/lib/models"
)

// Create inserts a notification for userID, triggered by actorID.
// It is a no-op if userID == actorID (don't notify yourself) or if
// userID is empty.
func Create(database *gorm.DB, userID, actorID, ntype, title, body, link string) {
	if database == nil || userID == "" || userID == actorID {
		return
	}
	database.Create(&models.Notification{
		UserID:  userID,
		ActorID: actorID,
		Type:    ntype,
		Title:   title,
		Body:    body,
		Link:    link,
	})
}

// Truncate shortens s to at most max characters, appending "..." if cut.
func Truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
