// Package notify provides a small helper for creating in-app notifications
// from any API handler.
package notify

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"nile-connect/lib/email"
	"nile-connect/lib/models"
	"nile-connect/lib/webpush"
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
	pushFanout(database, userID, title, body, link)
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

// ── Grouped notifications ─────────────────────────────────────────────────────

// BatchWindow is how long related notifications merge into one tray row.
//
// Four hours is a deliberate compromise: long enough that a post picking up
// reactions through an afternoon produces one row rather than thirty, short
// enough that a reaction tomorrow reads as new activity rather than being
// silently folded into yesterday's.
const BatchWindow = 4 * time.Hour

// GroupedInput describes a notification that should merge with its siblings.
type GroupedInput struct {
	UserID  string
	ActorID string
	Type    string

	// GroupKey identifies the set to merge into — typically
	// "<verb>:<subject_type>:<subject_id>". Two notifications sharing a key
	// inside BatchWindow become one row.
	GroupKey string

	// Title is used when this is the only actor.
	Title string
	// OthersTitle is a fmt template taking (firstActorName, otherCount) and is
	// used once a second actor joins.
	OthersTitle string
	// ActorName is the display name of the actor being added.
	ActorName string

	Body        string
	Link        string
	SubjectType string
	SubjectID   string
}

// Grouped creates or merges a notification.
//
// If an unread row with the same GroupKey exists inside BatchWindow, its actor
// count is incremented and its title rewritten; otherwise a new row is created.
// The merge deliberately targets UNREAD rows only: once someone has read
// "Ada reacted to your post", later activity should surface as a fresh
// notification rather than mutating something they have already seen.
//
// Best-effort, like everything in this package: failures are swallowed so a
// notification never breaks the action that produced it.
func Grouped(database *gorm.DB, in GroupedInput) {
	if database == nil || in.UserID == "" || in.UserID == in.ActorID {
		return
	}

	title := in.Title
	if title == "" {
		return
	}

	if in.GroupKey != "" {
		var existing models.Notification
		err := database.Where(
			"user_id = ? AND group_key = ? AND is_read = ? AND created_at > ?",
			in.UserID, in.GroupKey, false, time.Now().Add(-BatchWindow),
		).Order("created_at desc").First(&existing).Error

		if err == nil {
			// Same actor acting twice (react, un-react, re-react) must not
			// inflate the count.
			if existing.ActorID == in.ActorID && existing.ActorCount <= 1 {
				database.Model(&existing).Updates(map[string]any{
					"title":      title,
					"body":       in.Body,
					"updated_at": time.Now(),
				})
				return
			}

			others := existing.ActorCount // the existing row's actors, plus this new one
			newTitle := title
			if in.OthersTitle != "" && others >= 1 {
				newTitle = fmt.Sprintf(in.OthersTitle, firstActorName(existing.Title, in.ActorName), others)
			}
			database.Model(&existing).Updates(map[string]any{
				"actor_count": existing.ActorCount + 1,
				"title":       newTitle,
				"body":        in.Body,
				"is_read":     false,
				"updated_at":  time.Now(),
			})
			return
		}
	}

	database.Create(&models.Notification{
		UserID:      in.UserID,
		ActorID:     in.ActorID,
		Type:        in.Type,
		Title:       title,
		Body:        in.Body,
		Link:        in.Link,
		GroupKey:    in.GroupKey,
		ActorCount:  1,
		SubjectType: in.SubjectType,
		SubjectID:   in.SubjectID,
	})
	// Push only on the FIRST notification of a group. Pushing on every merge
	// would buzz the device once per actor — precisely the spam that grouping
	// exists to prevent.
	pushFanout(database, in.UserID, title, in.Body, in.Link)
}

// firstActorName keeps the original first actor's name in a grouped title, so
// the row stays "Ada and 4 others" rather than flipping to whoever acted last.
// It recovers the name from the existing title, falling back to the new actor.
func firstActorName(existingTitle, fallback string) string {
	if existingTitle == "" {
		return fallback
	}
	if idx := strings.Index(existingTitle, " and "); idx > 0 {
		return existingTitle[:idx]
	}
	// An ungrouped title reads "<Name> <verb>..."; take up to the first verb
	// boundary conservatively by splitting on the first two words.
	fields := strings.Fields(existingTitle)
	if len(fields) >= 2 {
		// Names are commonly two words in this population.
		if len(fields) >= 3 && isLikelyNameWord(fields[1]) {
			return fields[0] + " " + fields[1]
		}
		return fields[0]
	}
	return fallback
}

// isLikelyNameWord reports whether a word looks like part of a person's name
// (capitalised) rather than a verb.
func isLikelyNameWord(w string) bool {
	if w == "" {
		return false
	}
	r := rune(w[0])
	return r >= 'A' && r <= 'Z'
}

// ── Web push delivery ─────────────────────────────────────────────────────────

// pushFanout delivers a notification to every device a user has registered.
//
// Called from Create and Grouped so push follows the in-app tray automatically:
// a new notification type never has to remember to send a push, and can never
// send one the in-app tray did not also record.
//
// Entirely best-effort. Push is an enhancement layered on top of the
// notification row that is already durably stored, so a dead endpoint, an
// unconfigured VAPID key or an offline push service changes nothing about what
// the user sees when they next open the app.
func pushFanout(database *gorm.DB, userID, title, body, link string) {
	if database == nil || userID == "" || !webpush.Configured() {
		return
	}

	var subs []models.PushSubscription
	if err := database.Where("user_id = ? AND deleted_at IS NULL", userID).
		Limit(10).Find(&subs).Error; err != nil {
		return
	}

	for i := range subs {
		sub := subs[i]
		err := webpush.Send(
			webpush.Subscription{Endpoint: sub.Endpoint, P256dh: sub.P256dh, Auth: sub.Auth},
			webpush.Payload{
				Title: title,
				Body:  Truncate(body, 140),
				URL:   link,
				Icon:  "/icon-192.png",
				Badge: "/badge-72.png",
				// Tagging by user collapses a burst on the device the same way
				// GroupKey collapses it in the tray.
				Tag:      "nile-" + userID,
				Renotify: true,
			},
			24*60*60,
		)

		switch {
		case err == nil:
			now := time.Now()
			database.Model(&models.PushSubscription{}).Where("id = ?", sub.ID).
				Updates(map[string]any{"failure_count": 0, "last_sent_at": now})

		case errors.Is(err, webpush.ErrGone):
			// The browser discarded this endpoint. Keeping it would mean
			// retrying a dead device forever.
			database.Unscoped().Where("id = ?", sub.ID).Delete(&models.PushSubscription{})

		default:
			// Transient failure: count it, and prune only after the endpoint
			// has failed repeatedly, so one network blip does not unsubscribe
			// a working device.
			database.Model(&models.PushSubscription{}).Where("id = ?", sub.ID).
				UpdateColumn("failure_count", gorm.Expr("failure_count + 1"))
			database.Where("id = ? AND failure_count >= ?", sub.ID, 10).
				Delete(&models.PushSubscription{})
		}
	}
}
