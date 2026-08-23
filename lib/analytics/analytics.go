// Package analytics records privacy-conscious product events.
//
// Two rules govern everything here, and both come from the spec's instruction
// to "avoid collecting unnecessary sensitive data":
//
//  1. Events carry an actor, a verb, a subject reference and a small bag of
//     non-identifying dimensions. They NEVER carry content — no post bodies,
//     no message text, no search queries, no free text the user typed. A
//     table that mirrors everyone's writing is a second breach surface with
//     none of the access controls the original has.
//
//  2. Writes are best-effort and never block. An analytics failure must not
//     fail the action being measured.
//
// Deliberately not a generic event bus: a narrow API is what keeps rule 1
// enforceable by reading this file.
package analytics

import (
	"encoding/json"

	"gorm.io/gorm"

	"nile-connect/lib/models"
)

// Event names. A closed vocabulary, so a dashboard query cannot silently miss
// events because a caller invented a new spelling.
const (
	PostCreated    = "post_created"
	PostReacted    = "post_reacted"
	PostReposted   = "post_reposted"
	PostCommented  = "post_commented"
	PostBookmarked = "post_bookmarked"
	PostHidden     = "post_hidden"

	FeedViewed = "feed_viewed"

	UserFollowed = "user_followed"
	UserBlocked  = "user_blocked"
	UserMuted    = "user_muted"

	StoryCreated   = "story_created"
	StoryViewed    = "story_viewed"
	StoryCompleted = "story_completed"

	GroupCreated = "group_created"
	GroupJoined  = "group_joined"

	CommunityJoined = "community_joined"

	ReportSubmitted  = "report_submitted"
	ContentModerated = "content_moderated"
	UserRestricted   = "user_restricted"

	PrivacyChanged = "privacy_changed"
	MediaUploaded  = "media_uploaded"
)

// Props is a small bag of non-identifying dimensions: counts, enum values,
// booleans, durations. Never free text.
type Props map[string]any

// Track records one event. Safe to call with a nil database.
func Track(db *gorm.DB, actorID, name, subjectType, subjectID string, props Props) {
	if db == nil || name == "" {
		return
	}
	encoded := ""
	if len(props) > 0 {
		if b, err := json.Marshal(sanitize(props)); err == nil {
			encoded = string(b)
		}
	}
	// Errors are swallowed on purpose: measurement must never break the thing
	// being measured.
	db.Create(&models.AnalyticsEvent{
		ActorID:     actorID,
		Name:        name,
		SubjectType: subjectType,
		SubjectID:   subjectID,
		Props:       encoded,
	})
}

// allowedProps is the closed set of dimension names that may be recorded.
//
// An ALLOWLIST, not a heuristic. The first version of this function tried to
// tell content from dimensions by string length, and a unit test immediately
// found the hole: "meet me at 3pm behind the library" is only 41 characters,
// so a length rule happily stores it. There is no reliable way to inspect a
// VALUE and know whether it is content, so the KEY decides instead — and the
// set of keys lives here where it can be reviewed.
//
// Adding a key to this map is the deliberate act of deciding a dimension is
// safe to retain.
var allowedProps = map[string]bool{
	// Content shape (never content itself)
	"kind": true, "audience": true, "media_count": true,
	"has_media": true, "has_link": true, "has_poll": true,
	"is_repost": true, "is_quote": true, "text_length": true,

	// Interaction
	"reaction": true, "source": true, "mode": true, "position": true,
	"completed": true, "duration_ms": true,

	// Relationships
	"scope": true, "role": true, "status": true,

	// Moderation (the reason CATEGORY, never the reporter's free text)
	"reason": true, "priority": true, "restriction": true, "is_urgent": true,

	// Media (the sniffed category and a coarse size bucket, never a filename)
	"mime_category": true, "size_bucket": true,

	// Generic magnitudes
	"count": true, "total": true, "page": true,
}

// maxPropValueLen bounds an allowlisted string, so even a permitted key
// cannot become a content dump if a caller passes the wrong thing.
const maxPropValueLen = 64

// sanitize keeps only allowlisted keys holding scalar values.
//
// This is the enforcement point for rule 1: a key that is not in
// allowedProps is dropped regardless of what it holds, so a careless caller
// passing Props{"post_body": body} records nothing rather than everything.
func sanitize(props Props) Props {
	out := Props{}
	for k, v := range props {
		if !allowedProps[k] {
			continue // not a reviewed dimension — dropped, whatever it holds
		}
		switch val := v.(type) {
		case bool, int, int8, int16, int32, int64, float32, float64:
			out[k] = val
		case string:
			// Even an allowlisted key must hold an enum-sized value.
			if len(val) <= maxPropValueLen {
				out[k] = val
			}
		}
		// Maps, slices and everything else are dropped: they could nest
		// arbitrary content.
	}
	return out
}

// Counts is a simple aggregate for the admin dashboard.
type Counts struct {
	Name  string `json:"name"`
	Total int64  `json:"total"`
}

// Since returns event totals grouped by name for the given window in hours.
func Since(db *gorm.DB, hours int) []Counts {
	if db == nil || hours <= 0 {
		return []Counts{}
	}
	var out []Counts
	db.Model(&models.AnalyticsEvent{}).
		Select("name, COUNT(*) as total").
		Where("created_at > NOW() - (? * INTERVAL '1 hour')", hours).
		Group("name").
		Order("total desc").
		Scan(&out)
	if out == nil {
		out = []Counts{}
	}
	return out
}

// ActiveUsers counts distinct actors in the window — the DAU/WAU figure the
// spec asks the admin dashboard to show.
func ActiveUsers(db *gorm.DB, hours int) int64 {
	if db == nil || hours <= 0 {
		return 0
	}
	var n int64
	db.Model(&models.AnalyticsEvent{}).
		Where("created_at > NOW() - (? * INTERVAL '1 hour') AND actor_id <> ''", hours).
		Distinct("actor_id").
		Count(&n)
	return n
}
