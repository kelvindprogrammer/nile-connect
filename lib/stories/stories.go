// Package stories owns the ephemeral Stories domain.
//
// Design decisions worth stating up front:
//
//   - Expired stories are FILTERED on read, never deleted. A story reported
//     minutes before it expired must still be reviewable by a moderator, and
//     the author's own archive would otherwise vanish. Deletion is a separate,
//     explicit act.
//
//   - Visibility reuses lib/privacy rather than reimplementing audience rules.
//     A story is just content with an audience; giving it its own parallel
//     check is how the two drift apart and one of them becomes a leak.
//
//   - Analytics (who viewed, completion rate) are author-only. Exposing viewer
//     lists to anyone else turns a casual share into surveillance.
package stories

import (
	"errors"
	"sort"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"nile-connect/lib/models"
	"nile-connect/lib/privacy"
	"nile-connect/lib/socialgraph"
)

// Lifetime is how long a story stays visible.
const Lifetime = 24 * time.Hour

// MaxPerAuthorInTray bounds how many of one author's stories the tray will
// carry, so a single prolific poster cannot make the tray unusable.
const MaxPerAuthorInTray = 30

var (
	ErrNotFound    = errors.New("that story is no longer available")
	ErrForbidden   = errors.New("you cannot do that")
	ErrInvalidKind = errors.New("a story must be text, image or video")
)

var validKinds = map[string]bool{"text": true, "image": true, "video": true}

// CreateInput is a new story.
type CreateInput struct {
	AuthorID string
	Kind     string

	MediaURL     string
	ThumbnailURL string
	Width        int
	Height       int
	DurationMs   int

	Text            string
	BackgroundColor string
	// Overlays is client-authored JSON describing positioned text, stickers
	// and mentions. Stored opaquely: the server does not interpret it, and the
	// client must never render it as HTML.
	Overlays string

	Audience string
	// CustomAudience is the explicit allow-list when Audience == "custom".
	CustomAudience []string

	PollID *string
}

// Create stores a story and its custom audience atomically.
func Create(db *gorm.DB, in CreateInput) (models.Story, error) {
	if !validKinds[in.Kind] {
		return models.Story{}, ErrInvalidKind
	}
	// A text story needs words; a media story needs media. Neither is
	// meaningful empty.
	if in.Kind == "text" && in.Text == "" {
		return models.Story{}, errors.New("write something for your story")
	}
	if in.Kind != "text" && in.MediaURL == "" {
		return models.Story{}, errors.New("that story needs an image or video")
	}

	settings := privacy.SettingsFor(db, in.AuthorID)
	audience := privacy.NormalizeAudience(in.Audience, settings.DefaultStoryAudience)
	// A custom audience with nobody on it would publish to no one, which is
	// almost certainly not what the author meant.
	if audience == privacy.AudienceCustom && len(in.CustomAudience) == 0 {
		audience = privacy.AudienceConnections
	}

	story := models.Story{
		AuthorID:        in.AuthorID,
		Kind:            in.Kind,
		MediaURL:        in.MediaURL,
		ThumbnailURL:    in.ThumbnailURL,
		Width:           in.Width,
		Height:          in.Height,
		DurationMs:      in.DurationMs,
		Text:            in.Text,
		BackgroundColor: in.BackgroundColor,
		Overlays:        in.Overlays,
		Audience:        audience,
		ExpiresAt:       time.Now().Add(Lifetime),
		PollID:          in.PollID,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&story).Error; err != nil {
			return err
		}
		if audience == privacy.AudienceCustom {
			for _, uid := range in.CustomAudience {
				if uid == "" || uid == in.AuthorID {
					continue
				}
				// A blocked person must not be addable to an audience.
				if socialgraph.IsBlockedEither(tx, in.AuthorID, uid) {
					continue
				}
				if err := tx.Clauses(clause.OnConflict{
					Columns:   []clause.Column{{Name: "story_id"}, {Name: "user_id"}},
					DoNothing: true,
				}).Create(&models.StoryAudienceMember{StoryID: story.ID, UserID: uid}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return models.Story{}, err
	}
	return story, nil
}

// Item is one story as returned to a viewer.
type Item struct {
	ID           string    `json:"id"`
	AuthorID     string    `json:"author_id"`
	Kind         string    `json:"kind"`
	MediaURL     string    `json:"media_url,omitempty"`
	ThumbnailURL string    `json:"thumbnail_url,omitempty"`
	Width        int       `json:"width,omitempty"`
	Height       int       `json:"height,omitempty"`
	DurationMs   int       `json:"duration_ms,omitempty"`
	Text         string    `json:"text,omitempty"`
	Background   string    `json:"background_color,omitempty"`
	Overlays     string    `json:"overlays,omitempty"`
	Audience     string    `json:"audience"`
	PollID       *string   `json:"poll_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	ExpiresAt    time.Time `json:"expires_at"`

	// Viewed is this viewer's own state, used to pick up where they left off.
	Viewed bool `json:"viewed"`

	// Author-only analytics. Omitted entirely for other viewers rather than
	// zeroed, so a client cannot infer counts from their presence.
	ViewsCount     *int `json:"views_count,omitempty"`
	ReactionsCount *int `json:"reactions_count,omitempty"`
	RepliesCount   *int `json:"replies_count,omitempty"`
}

// Tray is one author's stories, grouped for the horizontal rail.
type Tray struct {
	AuthorID  string `json:"author_id"`
	Items     []Item `json:"items"`
	HasUnseen bool   `json:"has_unseen"`
	// LatestAt drives tray ordering.
	LatestAt time.Time `json:"latest_at"`
	IsSelf   bool      `json:"is_self"`
}

// LoadTray returns every story tray the viewer may see.
//
// Ordering follows what people expect from a story rail: your own first, then
// unseen authors newest-first, then already-seen authors. Sorting purely by
// recency would bury unseen stories behind ones already watched.
func LoadTray(db *gorm.DB, viewerID string) []Tray {
	if viewerID == "" {
		return []Tray{}
	}

	q := db.Model(&models.Story{}).
		Where("deleted_at IS NULL AND expires_at > ?", time.Now())

	// Blocked and muted authors are excluded in SQL, for the same reason as
	// the feed: filtering afterwards silently shrinks the result.
	if blocked := socialgraph.BlockedIDs(db, viewerID); len(blocked) > 0 {
		q = q.Where("author_id NOT IN ?", blocked)
	}
	if muted := socialgraph.MutedIDs(db, viewerID, "stories"); len(muted) > 0 {
		q = q.Where("author_id NOT IN ?", muted)
	}

	var rows []models.Story
	if err := q.Order("created_at asc").Limit(500).Find(&rows).Error; err != nil {
		return []Tray{}
	}
	if len(rows) == 0 {
		return []Tray{}
	}

	authorIDs := make([]string, 0, len(rows))
	storyIDs := make([]string, 0, len(rows))
	for i := range rows {
		authorIDs = append(authorIDs, rows[i].AuthorID)
		storyIDs = append(storyIDs, rows[i].ID)
	}
	rels := socialgraph.ResolveMany(db, viewerID, authorIDs)
	custom := customAudienceMembership(db, viewerID, storyIDs)
	seen := viewedSet(db, viewerID, storyIDs)

	byAuthor := map[string]*Tray{}
	for i := range rows {
		s := rows[i]
		isSelf := s.AuthorID == viewerID

		rel := rels[s.AuthorID]
		if isSelf {
			rel.IsSelf = true
		}
		if !privacy.CanView(rel, s.Audience, privacy.ViewContext{InCustomAudience: custom[s.ID]}) {
			continue
		}

		tray, ok := byAuthor[s.AuthorID]
		if !ok {
			tray = &Tray{AuthorID: s.AuthorID, IsSelf: isSelf, Items: []Item{}}
			byAuthor[s.AuthorID] = tray
		}
		if len(tray.Items) >= MaxPerAuthorInTray {
			continue
		}

		item := toItem(&s, isSelf)
		item.Viewed = seen[s.ID]
		tray.Items = append(tray.Items, item)
		if !item.Viewed {
			tray.HasUnseen = true
		}
		if s.CreatedAt.After(tray.LatestAt) {
			tray.LatestAt = s.CreatedAt
		}
	}

	out := make([]Tray, 0, len(byAuthor))
	for _, t := range byAuthor {
		out = append(out, *t)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].IsSelf != out[j].IsSelf {
			return out[i].IsSelf // your own ring always leads
		}
		if out[i].HasUnseen != out[j].HasUnseen {
			return out[i].HasUnseen // unseen before seen
		}
		if !out[i].LatestAt.Equal(out[j].LatestAt) {
			return out[i].LatestAt.After(out[j].LatestAt)
		}
		return out[i].AuthorID < out[j].AuthorID // deterministic tie-break
	})
	return out
}

// LoadForAuthor returns one author's live stories, checked against the viewer.
func LoadForAuthor(db *gorm.DB, viewerID, authorID string) ([]Item, error) {
	if viewerID == "" || authorID == "" {
		return nil, ErrForbidden
	}
	if socialgraph.IsBlockedEither(db, viewerID, authorID) {
		return nil, ErrNotFound
	}

	var rows []models.Story
	db.Where("author_id = ? AND deleted_at IS NULL AND expires_at > ?", authorID, time.Now()).
		Order("created_at asc").Limit(MaxPerAuthorInTray).Find(&rows)
	if len(rows) == 0 {
		return []Item{}, nil
	}

	ids := make([]string, 0, len(rows))
	for i := range rows {
		ids = append(ids, rows[i].ID)
	}
	rel := socialgraph.Resolve(db, viewerID, authorID)
	custom := customAudienceMembership(db, viewerID, ids)
	seen := viewedSet(db, viewerID, ids)
	isSelf := viewerID == authorID

	out := make([]Item, 0, len(rows))
	for i := range rows {
		s := rows[i]
		if !privacy.CanView(rel, s.Audience, privacy.ViewContext{InCustomAudience: custom[s.ID]}) {
			continue
		}
		item := toItem(&s, isSelf)
		item.Viewed = seen[s.ID]
		out = append(out, item)
	}
	return out, nil
}

// CanViewStory is the single gate used before recording a view, reacting or
// replying, so all three agree on visibility.
func CanViewStory(db *gorm.DB, viewerID string, story *models.Story) bool {
	if story.DeletedAt.Valid || story.ExpiresAt.Before(time.Now()) {
		return false
	}
	rel := socialgraph.Resolve(db, viewerID, story.AuthorID)
	inCustom := false
	if story.Audience == privacy.AudienceCustom {
		var n int64
		db.Model(&models.StoryAudienceMember{}).
			Where("story_id = ? AND user_id = ?", story.ID, viewerID).Count(&n)
		inCustom = n > 0
	}
	return privacy.CanView(rel, story.Audience, privacy.ViewContext{InCustomAudience: inCustom})
}

// MarkViewed records that viewerID saw a story.
//
// Idempotent on (story, viewer): re-watching does not inflate the view count,
// but `completed` can be upgraded from false to true so the completion metric
// reflects the best watch, not the first.
func MarkViewed(db *gorm.DB, storyID, viewerID string, completed bool) error {
	var story models.Story
	if err := db.Where("id = ?", storyID).First(&story).Error; err != nil {
		return ErrNotFound
	}
	if !CanViewStory(db, viewerID, &story) {
		return ErrNotFound
	}
	// An author browsing their own story is not an audience view.
	if story.AuthorID == viewerID {
		return nil
	}

	return db.Transaction(func(tx *gorm.DB) error {
		view := models.StoryView{StoryID: storyID, ViewerID: viewerID, Completed: completed}
		assign := map[string]any{"updated_at": time.Now()}
		if completed {
			assign["completed"] = true // never downgrade a completed watch
		}
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "story_id"}, {Name: "viewer_id"}},
			DoUpdates: clause.Assignments(assign),
		}).Create(&view).Error; err != nil {
			return err
		}
		return recountViews(tx, storyID)
	})
}

func recountViews(tx *gorm.DB, storyID string) error {
	return tx.Exec(`UPDATE stories SET views_count = (
			SELECT COUNT(*) FROM story_views WHERE story_id = ?
		) WHERE id = ?`, storyID, storyID).Error
}

// Analytics is the author-only performance view for one story.
type Analytics struct {
	StoryID        string  `json:"story_id"`
	Views          int     `json:"views"`
	UniqueViewers  int     `json:"unique_viewers"`
	Completions    int     `json:"completions"`
	CompletionRate float64 `json:"completion_rate"`
	Reactions      int     `json:"reactions"`
	Replies        int     `json:"replies"`
}

// LoadAnalytics returns per-story performance. Callers MUST confirm the
// requester is the author first — this function does not check.
func LoadAnalytics(db *gorm.DB, storyID string) Analytics {
	a := Analytics{StoryID: storyID}
	var total, completed int64
	db.Model(&models.StoryView{}).Where("story_id = ?", storyID).Count(&total)
	db.Model(&models.StoryView{}).Where("story_id = ? AND completed = ?", storyID, true).Count(&completed)

	a.Views = int(total)
	a.UniqueViewers = int(total) // one row per viewer, so these coincide
	a.Completions = int(completed)
	if total > 0 {
		a.CompletionRate = float64(completed) / float64(total)
	}

	var story models.Story
	if db.Where("id = ?", storyID).First(&story).Error == nil {
		a.Reactions = story.ReactionsCount
		a.Replies = story.RepliesCount
	}
	return a
}

// ViewerIDs lists who watched a story, newest first. Author-only; the caller
// must enforce that.
func ViewerIDs(db *gorm.DB, storyID string, limit int) []string {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	var ids []string
	db.Model(&models.StoryView{}).Where("story_id = ?", storyID).
		Order("created_at desc").Limit(limit).Pluck("viewer_id", &ids)
	return ids
}

// Delete removes a story. Only the author or staff may call this; the caller
// enforces that.
func Delete(db *gorm.DB, storyID string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Views and audience rows are hard-deleted: both sit under unique
		// indexes and have no independent audit value.
		if err := tx.Unscoped().Where("story_id = ?", storyID).
			Delete(&models.StoryView{}).Error; err != nil {
			return err
		}
		if err := tx.Unscoped().Where("story_id = ?", storyID).
			Delete(&models.StoryAudienceMember{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", storyID).Delete(&models.Story{}).Error
	})
}

// ── helpers ───────────────────────────────────────────────────────────────────

func toItem(s *models.Story, includeAnalytics bool) Item {
	item := Item{
		ID: s.ID, AuthorID: s.AuthorID, Kind: s.Kind,
		MediaURL: s.MediaURL, ThumbnailURL: s.ThumbnailURL,
		Width: s.Width, Height: s.Height, DurationMs: s.DurationMs,
		Text: s.Text, Background: s.BackgroundColor, Overlays: s.Overlays,
		Audience: s.Audience, PollID: s.PollID,
		CreatedAt: s.CreatedAt, ExpiresAt: s.ExpiresAt,
	}
	if includeAnalytics {
		views, reactions, replies := s.ViewsCount, s.ReactionsCount, s.RepliesCount
		item.ViewsCount = &views
		item.ReactionsCount = &reactions
		item.RepliesCount = &replies
	}
	return item
}

func viewedSet(db *gorm.DB, viewerID string, storyIDs []string) map[string]bool {
	out := map[string]bool{}
	if viewerID == "" || len(storyIDs) == 0 {
		return out
	}
	var ids []string
	db.Model(&models.StoryView{}).
		Where("viewer_id = ? AND story_id IN ?", viewerID, storyIDs).
		Pluck("story_id", &ids)
	for _, id := range ids {
		out[id] = true
	}
	return out
}

func customAudienceMembership(db *gorm.DB, viewerID string, storyIDs []string) map[string]bool {
	out := map[string]bool{}
	if viewerID == "" || len(storyIDs) == 0 {
		return out
	}
	var ids []string
	db.Model(&models.StoryAudienceMember{}).
		Where("user_id = ? AND story_id IN ?", viewerID, storyIDs).
		Pluck("story_id", &ids)
	for _, id := range ids {
		out[id] = true
	}
	return out
}
