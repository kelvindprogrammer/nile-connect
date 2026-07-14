// Package notify provides a small helper for creating in-app notifications
// from any API handler.
package notify

import (
	"gorm.io/gorm"

	"nile-connect/lib/email"
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

// CreateAndEmail does everything Create does, then additionally resolves
// userID's email address and sends an email built by tmplFn. Both the
// in-app notification and the email are best-effort: a failure to resolve
// the user or send the email never surfaces as an error to the caller.
func CreateAndEmail(database *gorm.DB, userID, actorID, ntype, title, body, link string, tmplFn func() (subject, html string)) {
	Create(database, userID, actorID, ntype, title, body, link)
	if database == nil || userID == "" {
		return
	}
	var user models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error; err != nil || user.Email == "" {
		return
	}
	subject, html := tmplFn()
	email.Send(user.Email, subject, html)
}

// Truncate shortens s to at most max characters, appending "..." if cut.
func Truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
