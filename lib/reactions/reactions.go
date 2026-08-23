// Package reactions owns the reaction vocabulary and the toggle semantics
// shared by posts, comments and stories.
//
// It replaces the old like-only model (a PostLike row that existed or did not)
// with a typed reaction, while keeping PostLike written in lockstep so every
// existing reader of likes_count keeps working. That dual-write is deliberate
// and temporary-by-design: it is documented here rather than hidden, and
// Migrate() below can retire it once no reader depends on PostLike.
package reactions

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"nile-connect/lib/models"
)

// Kind is a reaction type. The set is deliberately small and positive.
//
// There is no "dislike" or "angry": the audience is students, and a public
// downvote on a named classmate's post is a bullying vector with no
// educational upside. Negative feedback is expressed privately through
// FeedSignal ("not interested") instead, where it tunes the feed without
// broadcasting a judgement.
type Kind string

const (
	Like       Kind = "like"
	Love       Kind = "love"
	Celebrate  Kind = "celebrate"
	Insightful Kind = "insightful"
	Support    Kind = "support"
	Funny      Kind = "funny"
)

// Ordered is the display order used by every client.
var Ordered = []Kind{Like, Love, Celebrate, Insightful, Support, Funny}

var valid = map[Kind]bool{
	Like: true, Love: true, Celebrate: true,
	Insightful: true, Support: true, Funny: true,
}

// Meta describes a reaction for the UI, so the label and emoji are defined
// once on the server rather than drifting between three clients.
type Meta struct {
	Kind  Kind   `json:"kind"`
	Label string `json:"label"`
	Emoji string `json:"emoji"`
}

var metaByKind = map[Kind]Meta{
	Like:       {Like, "Like", "👍"},
	Love:       {Love, "Love", "❤️"},
	Celebrate:  {Celebrate, "Celebrate", "🎉"},
	Insightful: {Insightful, "Insightful", "💡"},
	Support:    {Support, "Support", "🤝"},
	Funny:      {Funny, "Funny", "😄"},
}

// Catalog returns the full vocabulary in display order.
func Catalog() []Meta {
	out := make([]Meta, 0, len(Ordered))
	for _, k := range Ordered {
		out = append(out, metaByKind[k])
	}
	return out
}

// Subject types a reaction may target.
const (
	SubjectPost    = "post"
	SubjectComment = "comment"
	SubjectStory   = "story"
)

var validSubjects = map[string]bool{
	SubjectPost: true, SubjectComment: true, SubjectStory: true,
}

var (
	ErrInvalidKind    = errors.New("that reaction is not available")
	ErrInvalidSubject = errors.New("you cannot react to that")
)

// Normalize coerces client input to a valid Kind, defaulting to Like. An
// unknown reaction becoming a like is the right failure mode: it preserves the
// user's intent to react positively without letting a client invent types.
func Normalize(raw string) Kind {
	k := Kind(raw)
	if valid[k] {
		return k
	}
	return Like
}

// IsValid reports whether raw names a real reaction.
func IsValid(raw string) bool { return valid[Kind(raw)] }

// Summary is the aggregate shown on a piece of content.
type Summary struct {
	// Counts holds only the non-zero reaction types.
	Counts map[Kind]int `json:"counts"`
	Total  int          `json:"total"`
	// Mine is the caller's own reaction, empty when they have not reacted.
	Mine Kind `json:"mine,omitempty"`
	// Top is up to three kinds by count, for the compact facepile.
	Top []Kind `json:"top"`
}

// Result reports what a Toggle call actually did, so the caller can send the
// right notification (and send none when the user merely removed a reaction).
type Result struct {
	Summary Summary
	// Added is true when the user had no reaction and now has one.
	Added bool
	// Changed is true when the user swapped one reaction for another.
	Changed bool
	// Removed is true when the user cleared their reaction.
	Removed bool
}

// Toggle applies a reaction with the semantics users expect:
//
//	no reaction  + react X  -> X            (Added)
//	reaction X   + react X  -> none         (Removed)  — tapping again undoes
//	reaction X   + react Y  -> Y            (Changed)  — one reaction per user
//
// The whole operation runs in a transaction and recomputes the counters from
// the reaction rows rather than incrementing, so a double-tapped button or a
// retried request can never leave the count out of step with reality.
func Toggle(db *gorm.DB, subjectType, subjectID, userID, rawKind string) (Result, error) {
	var res Result
	if !validSubjects[subjectType] {
		return res, ErrInvalidSubject
	}
	if subjectID == "" || userID == "" {
		return res, ErrInvalidSubject
	}
	kind := Normalize(rawKind)

	err := db.Transaction(func(tx *gorm.DB) error {
		var existing models.Reaction
		findErr := tx.Where("subject_type = ? AND subject_id = ? AND user_id = ?",
			subjectType, subjectID, userID).First(&existing).Error

		switch {
		case findErr == nil && Kind(existing.Type) == kind:
			// Same reaction again — clear it.
			if err := tx.Unscoped().Where("id = ?", existing.ID).
				Delete(&models.Reaction{}).Error; err != nil {
				return err
			}
			res.Removed = true

		case findErr == nil:
			// Different reaction — replace in place, keeping one row per user.
			if err := tx.Model(&models.Reaction{}).Where("id = ?", existing.ID).
				Updates(map[string]any{"type": string(kind), "updated_at": time.Now()}).Error; err != nil {
				return err
			}
			res.Changed = true

		default:
			// No reaction yet. ON CONFLICT makes a racing double-submit
			// idempotent instead of inserting two rows.
			created := models.Reaction{
				SubjectType: subjectType, SubjectID: subjectID,
				UserID: userID, Type: string(kind),
			}
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "subject_type"}, {Name: "subject_id"}, {Name: "user_id"}},
				DoUpdates: clause.AssignmentColumns([]string{"type", "updated_at"}),
			}).Create(&created).Error; err != nil {
				return err
			}
			res.Added = true
		}

		return recount(tx, subjectType, subjectID, userID)
	})
	if err != nil {
		return Result{}, err
	}

	res.Summary = SummaryFor(db, subjectType, subjectID, userID)
	return res, nil
}

// recount rewrites the denormalised counters on the subject from the reaction
// rows themselves.
//
// PostLike is kept in sync here so existing readers of Post.LikesCount — the
// old feed, the notification copy, the profile stats — keep working unchanged
// while the richer reaction model rolls out.
func recount(tx *gorm.DB, subjectType, subjectID, userID string) error {
	var total int64
	if err := tx.Model(&models.Reaction{}).
		Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).
		Count(&total).Error; err != nil {
		return err
	}

	switch subjectType {
	case SubjectPost:
		// Mirror into the legacy PostLike table for this user only.
		var mine int64
		tx.Model(&models.Reaction{}).
			Where("subject_type = ? AND subject_id = ? AND user_id = ?", subjectType, subjectID, userID).
			Count(&mine)
		if mine > 0 {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "post_id"}, {Name: "user_id"}},
				DoNothing: true,
			}).Create(&models.PostLike{PostID: subjectID, UserID: userID}).Error; err != nil {
				return err
			}
		} else if err := tx.Unscoped().
			Where("post_id = ? AND user_id = ?", subjectID, userID).
			Delete(&models.PostLike{}).Error; err != nil {
			return err
		}
		return tx.Model(&models.Post{}).Where("id = ?", subjectID).
			Updates(map[string]any{"reactions_count": total, "likes_count": total}).Error

	case SubjectComment:
		return tx.Model(&models.Comment{}).Where("id = ?", subjectID).
			Update("reactions_count", total).Error

	case SubjectStory:
		return tx.Model(&models.Story{}).Where("id = ?", subjectID).
			Update("reactions_count", total).Error
	}
	return nil
}

// SummaryFor loads the aggregate for one subject.
func SummaryFor(db *gorm.DB, subjectType, subjectID, viewerID string) Summary {
	s := Summary{Counts: map[Kind]int{}, Top: []Kind{}}

	type row struct {
		Type string
		N    int
	}
	var rows []row
	db.Model(&models.Reaction{}).
		Select("type, COUNT(*) as n").
		Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).
		Group("type").Scan(&rows)

	for _, r := range rows {
		k := Kind(r.Type)
		if !valid[k] {
			continue // ignore a type retired from the vocabulary
		}
		s.Counts[k] = r.N
		s.Total += r.N
	}
	s.Top = topKinds(s.Counts)

	if viewerID != "" {
		var mine models.Reaction
		if err := db.Where("subject_type = ? AND subject_id = ? AND user_id = ?",
			subjectType, subjectID, viewerID).First(&mine).Error; err == nil {
			s.Mine = Kind(mine.Type)
		}
	}
	return s
}

// SummariesFor batches SummaryFor across many subjects of one type.
//
// This is what keeps the feed at two queries for reactions regardless of page
// size, instead of two queries per post.
func SummariesFor(db *gorm.DB, subjectType string, subjectIDs []string, viewerID string) map[string]Summary {
	out := map[string]Summary{}
	if len(subjectIDs) == 0 {
		return out
	}
	unique := make([]string, 0, len(subjectIDs))
	seen := map[string]bool{}
	for _, id := range subjectIDs {
		if id != "" && !seen[id] {
			seen[id] = true
			unique = append(unique, id)
			out[id] = Summary{Counts: map[Kind]int{}, Top: []Kind{}}
		}
	}
	if len(unique) == 0 {
		return out
	}

	type row struct {
		SubjectID string
		Type      string
		N         int
	}
	var rows []row
	db.Model(&models.Reaction{}).
		Select("subject_id, type, COUNT(*) as n").
		Where("subject_type = ? AND subject_id IN ?", subjectType, unique).
		Group("subject_id, type").Scan(&rows)

	for _, r := range rows {
		k := Kind(r.Type)
		if !valid[k] {
			continue
		}
		s := out[r.SubjectID]
		if s.Counts == nil {
			s.Counts = map[Kind]int{}
		}
		s.Counts[k] = r.N
		s.Total += r.N
		out[r.SubjectID] = s
	}

	if viewerID != "" {
		var mine []models.Reaction
		db.Where("subject_type = ? AND subject_id IN ? AND user_id = ?",
			subjectType, unique, viewerID).Find(&mine)
		for i := range mine {
			s := out[mine[i].SubjectID]
			s.Mine = Kind(mine[i].Type)
			out[mine[i].SubjectID] = s
		}
	}

	for id, s := range out {
		s.Top = topKinds(s.Counts)
		out[id] = s
	}
	return out
}

// topKinds returns up to three kinds ordered by count, breaking ties by the
// canonical display order so the facepile is stable across requests rather
// than shuffling on every load.
func topKinds(counts map[Kind]int) []Kind {
	out := make([]Kind, 0, 3)
	remaining := map[Kind]int{}
	for k, v := range counts {
		if v > 0 {
			remaining[k] = v
		}
	}
	for len(out) < 3 && len(remaining) > 0 {
		var best Kind
		bestN := -1
		for _, k := range Ordered { // canonical order breaks ties deterministically
			if n, ok := remaining[k]; ok && n > bestN {
				best, bestN = k, n
			}
		}
		if bestN < 0 {
			break
		}
		out = append(out, best)
		delete(remaining, best)
	}
	return out
}

// ReactorIDs lists who reacted to a subject, newest first, for the "who
// reacted" sheet. kind may be empty to list every reaction.
func ReactorIDs(db *gorm.DB, subjectType, subjectID string, kind Kind, limit, offset int) []string {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	q := db.Model(&models.Reaction{}).
		Where("subject_type = ? AND subject_id = ?", subjectType, subjectID)
	if valid[kind] {
		q = q.Where("type = ?", string(kind))
	}
	var ids []string
	q.Order("created_at desc").Limit(limit).Offset(offset).Pluck("user_id", &ids)
	return ids
}
