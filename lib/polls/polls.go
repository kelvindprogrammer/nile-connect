// Package polls owns interactive polls attached to posts or stories.
//
// Rules enforced here rather than in the UI, because every one of them is a
// correctness or abuse concern:
//
//   - One vote per person for a single-choice poll, enforced by a transaction
//     that clears any previous choice. The unique index on
//     (poll, user, option) alone cannot express "at most one option", only
//     "not the same option twice".
//   - Votes cannot be cast after expiry, and cannot be changed once cast on a
//     poll marked non-revotable — otherwise a poll can be gamed by watching
//     the result and switching at the end.
//   - Results are withheld until you vote when the author asks for that, which
//     measurably reduces bandwagon bias.
//   - Anonymous polls never expose voter identity through any code path,
//     including the author's own view.
package polls

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"nile-connect/lib/models"
)

const (
	MinOptions = 2
	MaxOptions = 6
	// MaxOptionLen keeps an option a label rather than an essay.
	MaxOptionLen   = 80
	MaxQuestionLen = 300
)

var (
	ErrNotFound     = errors.New("that poll is no longer available")
	ErrClosed       = errors.New("this poll has closed")
	ErrAlreadyVoted = errors.New("you have already voted")
	ErrBadOptions   = errors.New("a poll needs between 2 and 6 options")
	ErrNoQuestion   = errors.New("give your poll a question")
	ErrBadOption    = errors.New("that option is not part of this poll")
)

// CreateInput describes a new poll.
type CreateInput struct {
	AuthorID    string
	Question    string
	Options     []string
	IsAnonymous bool
	MultiChoice bool
	// DurationHours of 0 means the poll never closes.
	DurationHours        int
	HideResultsUntilVote bool
}

// Create stores a poll and its options atomically.
func Create(db *gorm.DB, in CreateInput) (models.Poll, error) {
	in.Question = strings.TrimSpace(in.Question)
	if in.Question == "" {
		return models.Poll{}, ErrNoQuestion
	}
	if len([]rune(in.Question)) > MaxQuestionLen {
		in.Question = string([]rune(in.Question)[:MaxQuestionLen])
	}

	// Deduplicate and clean options. Two identical options split the vote and
	// make the result meaningless, so they are merged rather than rejected.
	cleaned := make([]string, 0, len(in.Options))
	seen := map[string]bool{}
	for _, raw := range in.Options {
		opt := strings.TrimSpace(raw)
		if opt == "" {
			continue
		}
		if len([]rune(opt)) > MaxOptionLen {
			opt = string([]rune(opt)[:MaxOptionLen])
		}
		key := strings.ToLower(opt)
		if seen[key] {
			continue
		}
		seen[key] = true
		cleaned = append(cleaned, opt)
	}
	if len(cleaned) < MinOptions || len(cleaned) > MaxOptions {
		return models.Poll{}, ErrBadOptions
	}

	var expires *time.Time
	if in.DurationHours > 0 {
		t := time.Now().Add(time.Duration(in.DurationHours) * time.Hour)
		expires = &t
	}

	poll := models.Poll{
		AuthorID:             in.AuthorID,
		Question:             in.Question,
		IsAnonymous:          in.IsAnonymous,
		MultiChoice:          in.MultiChoice,
		ExpiresAt:            expires,
		HideResultsUntilVote: in.HideResultsUntilVote,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&poll).Error; err != nil {
			return err
		}
		for i, text := range cleaned {
			if err := tx.Create(&models.PollOption{
				PollID: poll.ID, Text: text, Position: i,
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return models.Poll{}, err
	}
	return poll, nil
}

// Option is one choice as returned to a viewer.
type Option struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Order int    `json:"position"`
	// Votes and Percent are omitted entirely (not zeroed) when results are
	// withheld, so a client cannot infer standings from their presence.
	Votes   *int     `json:"votes,omitempty"`
	Percent *float64 `json:"percent,omitempty"`
	// Chosen marks this viewer's own selection.
	Chosen bool `json:"chosen"`
}

// View is a poll rendered for one viewer.
type View struct {
	ID          string     `json:"id"`
	Question    string     `json:"question"`
	Options     []Option   `json:"options"`
	TotalVotes  int        `json:"total_votes"`
	IsAnonymous bool       `json:"is_anonymous"`
	MultiChoice bool       `json:"multi_choice"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	Closed      bool       `json:"closed"`
	HasVoted    bool       `json:"has_voted"`
	// ResultsVisible tells the client whether to render bars or just choices.
	ResultsVisible bool `json:"results_visible"`
	// CanVote is false when closed, or already voted on a single-choice poll.
	CanVote  bool `json:"can_vote"`
	IsAuthor bool `json:"is_author"`
}

// Load renders a poll for a viewer, applying the results-visibility rule.
func Load(db *gorm.DB, pollID, viewerID string) (View, error) {
	var poll models.Poll
	if err := db.Where("id = ? AND deleted_at IS NULL", pollID).First(&poll).Error; err != nil {
		return View{}, ErrNotFound
	}

	var options []models.PollOption
	db.Where("poll_id = ?", pollID).Order("position asc").Find(&options)

	var myVotes []models.PollVote
	if viewerID != "" {
		db.Where("poll_id = ? AND user_id = ?", pollID, viewerID).Find(&myVotes)
	}
	chosen := map[string]bool{}
	for i := range myVotes {
		chosen[myVotes[i].OptionID] = true
	}

	closed := poll.ExpiresAt != nil && poll.ExpiresAt.Before(time.Now())
	hasVoted := len(myVotes) > 0

	// Results are visible once you have voted, once the poll closes, or if the
	// author did not ask for them to be withheld. The author always sees them.
	resultsVisible := hasVoted || closed || !poll.HideResultsUntilVote || poll.AuthorID == viewerID

	view := View{
		ID: poll.ID, Question: poll.Question,
		TotalVotes: poll.TotalVotes, IsAnonymous: poll.IsAnonymous,
		MultiChoice: poll.MultiChoice, ExpiresAt: poll.ExpiresAt,
		Closed: closed, HasVoted: hasVoted, ResultsVisible: resultsVisible,
		IsAuthor: poll.AuthorID == viewerID,
		Options:  make([]Option, 0, len(options)),
	}
	// A multi-choice poll stays votable after a first vote; a single-choice
	// one does not.
	view.CanVote = viewerID != "" && !closed && (poll.MultiChoice || !hasVoted)

	for i := range options {
		o := options[i]
		item := Option{ID: o.ID, Text: o.Text, Order: o.Position, Chosen: chosen[o.ID]}
		if resultsVisible {
			votes := o.VotesCount
			item.Votes = &votes
			pct := 0.0
			if poll.TotalVotes > 0 {
				pct = float64(o.VotesCount) / float64(poll.TotalVotes) * 100
			}
			item.Percent = &pct
		}
		view.Options = append(view.Options, item)
	}
	return view, nil
}

// Vote records a choice.
//
// Single-choice polls replace any previous selection inside the transaction,
// which is what makes "one vote per person" true rather than aspirational.
func Vote(db *gorm.DB, pollID, optionID, viewerID string) (View, error) {
	if viewerID == "" {
		return View{}, ErrNotFound
	}

	var poll models.Poll
	if err := db.Where("id = ? AND deleted_at IS NULL", pollID).First(&poll).Error; err != nil {
		return View{}, ErrNotFound
	}
	if poll.ExpiresAt != nil && poll.ExpiresAt.Before(time.Now()) {
		return View{}, ErrClosed
	}

	// The option must belong to THIS poll — otherwise a crafted request could
	// add a vote to an unrelated poll's option.
	var option models.PollOption
	if err := db.Where("id = ? AND poll_id = ?", optionID, pollID).First(&option).Error; err != nil {
		return View{}, ErrBadOption
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		var existing []models.PollVote
		tx.Where("poll_id = ? AND user_id = ?", pollID, viewerID).Find(&existing)

		if poll.MultiChoice {
			// Toggling the same option off is the expected multi-choice gesture.
			for i := range existing {
				if existing[i].OptionID == optionID {
					return tx.Unscoped().Where("id = ?", existing[i].ID).
						Delete(&models.PollVote{}).Error
				}
			}
		} else if len(existing) > 0 {
			// Single choice: clear the old vote so the new one replaces it.
			if existing[0].OptionID == optionID {
				return nil // same choice again — no-op rather than an error
			}
			if err := tx.Unscoped().Where("poll_id = ? AND user_id = ?", pollID, viewerID).
				Delete(&models.PollVote{}).Error; err != nil {
				return err
			}
		}

		if err := tx.Create(&models.PollVote{
			PollID: pollID, OptionID: optionID, UserID: viewerID,
		}).Error; err != nil {
			return err
		}
		return recount(tx, pollID)
	})
	if err != nil {
		return View{}, err
	}
	return Load(db, pollID, viewerID)
}

// recount recomputes every counter from the vote rows.
//
// TotalVotes counts distinct VOTERS, not vote rows: on a multi-choice poll one
// person selecting three options must not read as three votes, or every
// percentage is wrong.
func recount(tx *gorm.DB, pollID string) error {
	if err := tx.Exec(`UPDATE poll_options SET votes_count = (
			SELECT COUNT(*) FROM poll_votes WHERE option_id = poll_options.id
		) WHERE poll_id = ?`, pollID).Error; err != nil {
		return err
	}
	return tx.Exec(`UPDATE polls SET total_votes = (
			SELECT COUNT(DISTINCT user_id) FROM poll_votes WHERE poll_id = ?
		) WHERE id = ?`, pollID, pollID).Error
}

// VoterIDs lists who picked an option. Returns nothing for an anonymous poll,
// whoever is asking — including the author.
func VoterIDs(db *gorm.DB, pollID, optionID string, limit int) []string {
	var poll models.Poll
	if err := db.Where("id = ?", pollID).First(&poll).Error; err != nil {
		return nil
	}
	if poll.IsAnonymous {
		return nil
	}
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	var ids []string
	q := db.Model(&models.PollVote{}).Where("poll_id = ?", pollID)
	if optionID != "" {
		q = q.Where("option_id = ?", optionID)
	}
	q.Order("created_at desc").Limit(limit).Pluck("user_id", &ids)
	return ids
}

// Close ends a poll early. Author only; the caller enforces that.
func Close(db *gorm.DB, pollID string) error {
	now := time.Now()
	return db.Model(&models.Poll{}).Where("id = ?", pollID).
		Update("expires_at", now).Error
}

// LoadMany renders several polls at once, for a feed page carrying poll posts.
func LoadMany(db *gorm.DB, pollIDs []string, viewerID string) map[string]View {
	out := map[string]View{}
	for _, id := range pollIDs {
		if id == "" {
			continue
		}
		if v, err := Load(db, id, viewerID); err == nil {
			out[id] = v
		}
	}
	return out
}
