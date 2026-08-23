// Package feedrank scores and diversifies the home feed.
//
// The spec is explicit that this must NOT be an addictive or manipulative
// recommendation system. That constraint shaped every decision here:
//
//   - The score is a small, closed-form sum of named signals. There is no
//     learned model, so a student can be told exactly why a post ranked where
//     it did, and a staff member can audit it by reading this file.
//   - Recency decays fast (a ~20-hour half-life), so the feed stays a picture
//     of campus *now* rather than an evergreen highlight reel engineered to
//     keep someone scrolling.
//   - Engagement is compressed with a logarithm and capped. A post cannot win
//     the feed on raw popularity alone, which is what stops a small number of
//     loud accounts from owning everyone's home page.
//   - Author diversity is enforced AFTER scoring, as a hard structural rule
//     rather than a soft penalty, so no amount of engagement lets one person
//     take three of the top five slots.
//   - Every negative signal a user gives is absolute, never probabilistic.
//     "Not interested" removes the item. It does not merely down-weight it.
//
// The package is pure: it takes already-loaded candidates and returns an
// order. That keeps it fully unit-testable and keeps ranking policy out of the
// SQL layer.
package feedrank

import (
	"math"
	"sort"
	"time"
)

// Weights are the tunable coefficients. Exported and documented so they can be
// adjusted deliberately, in one place, with the effect on the sum obvious.
type Weights struct {
	Recency    float64
	Affinity   float64
	Engagement float64
	// Quality rewards posts that carry real substance (media, a link, a poll,
	// enough text to say something) over one-word filler.
	Quality float64
	// GroupBoost lifts posts from groups the viewer joined, on the theory that
	// deliberately joining a space is a stronger statement of interest than
	// following a person.
	GroupBoost float64
	// FollowedTopic lifts posts carrying a hashtag the viewer engages with.
	FollowedTopic float64
}

// DefaultWeights sums to 1.0 across the primary signals so a score is
// interpretable as a 0..1 quality-of-match rather than an arbitrary number.
var DefaultWeights = Weights{
	Recency:       0.35,
	Affinity:      0.30,
	Engagement:    0.15,
	Quality:       0.10,
	GroupBoost:    0.06,
	FollowedTopic: 0.04,
}

// RecencyHalfLife is how long a post takes to lose half its freshness score.
// Twenty hours means yesterday's lecture announcement is still reachable this
// morning, while last week's is firmly behind today's.
const RecencyHalfLife = 20 * time.Hour

// MaxPerAuthorInWindow is the diversity rule: at most this many posts from one
// author inside each DiversityWindow slots.
const (
	MaxPerAuthorInWindow = 2
	DiversityWindow      = 10
)

// Candidate is one post being considered, with everything ranking needs
// already loaded. Ranking never queries.
type Candidate struct {
	PostID    string
	AuthorID  string
	CreatedAt time.Time

	// Affinity is the viewer's tie strength to the author, 0..1, from
	// socialgraph.Relation.Strength.
	Affinity float64

	// Engagement counters.
	Reactions int
	Comments  int
	Reposts   int

	// Content signals.
	TextLength int
	HasMedia   bool
	HasLink    bool
	HasPoll    bool

	// Context.
	InViewerGroup   bool
	MatchesInterest bool
	IsFollowed      bool

	// Suppression. Any of these removes the candidate outright.
	Muted         bool
	NotInterested bool
	Hidden        bool
	Blocked       bool

	// Seen marks a post the viewer already scrolled past in a previous
	// session. Demoted, never removed — the spec asks for user control and
	// transparency, and silently deleting things people have seen makes the
	// feed feel like it is hiding content.
	Seen bool
}

// Scored is a candidate with its computed score and the breakdown that
// produced it.
type Scored struct {
	Candidate
	Score float64
	// Explain is the per-signal contribution, exposed through a debug endpoint
	// so ranking can be inspected rather than guessed at.
	Explain map[string]float64
}

// recencyScore decays exponentially from 1.0 at publication.
func recencyScore(age time.Duration) float64 {
	if age < 0 {
		age = 0 // a clock-skewed future post is treated as brand new, not infinite
	}
	return math.Pow(0.5, age.Hours()/RecencyHalfLife.Hours())
}

// engagementScore compresses raw counts logarithmically and saturates at 1.0.
//
// The log is the anti-virality mechanism: going from 0 to 10 reactions moves
// the score far more than going from 100 to 1000. Popular content surfaces,
// runaway content does not dominate.
func engagementScore(reactions, comments, reposts int) float64 {
	// Comments and reposts signal more investment than a tap, so they weigh
	// more per unit.
	raw := float64(reactions) + 2.0*float64(comments) + 2.5*float64(reposts)
	if raw <= 0 {
		return 0
	}
	// log1p(raw)/log1p(saturation) reaches 1.0 at the saturation point.
	const saturation = 250.0
	return math.Min(1.0, math.Log1p(raw)/math.Log1p(saturation))
}

// qualityScore rewards substance. It is intentionally crude — the goal is to
// separate "here is a resource and a thought" from "lol", not to judge writing.
func qualityScore(c Candidate) float64 {
	s := 0.0
	switch {
	case c.TextLength >= 280:
		s += 0.4
	case c.TextLength >= 80:
		s += 0.3
	case c.TextLength >= 20:
		s += 0.15
	}
	if c.HasMedia {
		s += 0.3
	}
	if c.HasLink {
		s += 0.15
	}
	if c.HasPoll {
		s += 0.15 // interactive content earns its place
	}
	return math.Min(1.0, s)
}

// Score computes a single candidate's score against a reference time.
func Score(c Candidate, now time.Time, w Weights) Scored {
	explain := map[string]float64{}

	rec := recencyScore(now.Sub(c.CreatedAt))
	aff := clamp01(c.Affinity)
	eng := engagementScore(c.Reactions, c.Comments, c.Reposts)
	qual := qualityScore(c)

	explain["recency"] = w.Recency * rec
	explain["affinity"] = w.Affinity * aff
	explain["engagement"] = w.Engagement * eng
	explain["quality"] = w.Quality * qual

	if c.InViewerGroup {
		explain["group"] = w.GroupBoost
	}
	if c.MatchesInterest {
		explain["interest"] = w.FollowedTopic
	}

	total := 0.0
	for _, v := range explain {
		total += v
	}

	// Already-seen content is demoted hard but stays reachable.
	if c.Seen {
		explain["seen_penalty"] = -total * 0.6
		total *= 0.4
	}

	return Scored{Candidate: c, Score: total, Explain: explain}
}

// Rank scores, filters and diversifies a candidate set, returning the final
// order.
//
// Suppression happens first and is absolute; then scoring; then the diversity
// pass. Doing diversity last is what makes it a guarantee rather than a
// tendency.
func Rank(candidates []Candidate, now time.Time, w Weights) []Scored {
	scored := make([]Scored, 0, len(candidates))
	for _, c := range candidates {
		// Absolute suppression. A user's explicit "no" is never overridden by
		// a high score.
		if c.Blocked || c.Muted || c.NotInterested || c.Hidden {
			continue
		}
		scored = append(scored, Score(c, now, w))
	}

	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].Score != scored[j].Score {
			return scored[i].Score > scored[j].Score
		}
		// Deterministic tie-break: newer first, then by id so the order is
		// stable across identical requests and pagination cannot duplicate or
		// skip an item.
		if !scored[i].CreatedAt.Equal(scored[j].CreatedAt) {
			return scored[i].CreatedAt.After(scored[j].CreatedAt)
		}
		return scored[i].PostID < scored[j].PostID
	})

	return diversify(scored)
}

// diversify enforces the per-author cap with a sliding window.
//
// Implemented as a selection loop rather than a filter pass: repeatedly emit
// the highest-scoring candidate whose author is currently under the cap. That
// maximises spacing without ever dropping a post.
//
// The guarantee it provides, stated precisely: no author exceeds
// MaxPerAuthorInWindow slots in any DiversityWindow **while any candidate from
// another author remains unemitted**. Once the remaining pool is a single
// author, their posts must be emitted consecutively — the alternative would be
// discarding them, which is worse. In practice the tail of a real feed is the
// least-seen content, so the degradation lands where it matters least.
func diversify(scored []Scored) []Scored {
	if len(scored) <= MaxPerAuthorInWindow {
		return scored
	}

	out := make([]Scored, 0, len(scored))
	used := make([]bool, len(scored))
	// recent holds the author ids of the last DiversityWindow emitted posts.
	recent := make([]string, 0, DiversityWindow)

	countInWindow := func(author string) int {
		n := 0
		for _, a := range recent {
			if a == author {
				n++
			}
		}
		return n
	}
	emit := func(i int) {
		used[i] = true
		out = append(out, scored[i])
		recent = append(recent, scored[i].AuthorID)
		if len(recent) > DiversityWindow {
			recent = recent[1:]
		}
	}

	for len(out) < len(scored) {
		// `scored` is already in descending score order, so the first
		// unused-and-eligible index is the best eligible candidate.
		picked := -1
		for i := range scored {
			if used[i] {
				continue
			}
			if countInWindow(scored[i].AuthorID) < MaxPerAuthorInWindow {
				picked = i
				break
			}
		}
		if picked == -1 {
			// Nothing is eligible: every remaining candidate belongs to an
			// author already at the cap. Emit the best remaining anyway rather
			// than dropping it, and clear the window so spacing restarts.
			for i := range scored {
				if !used[i] {
					picked = i
					break
				}
			}
			if picked == -1 {
				break // unreachable; defensive
			}
			recent = recent[:0]
		}
		emit(picked)
	}

	return out
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

// ChronologicalIDs returns the candidates newest-first with no ranking at all.
//
// This backs a user-facing "Latest" toggle. Offering a genuine chronological
// escape hatch is a transparency requirement, not a nicety: a student who
// distrusts the ranked feed must be able to opt out of it entirely.
func ChronologicalIDs(candidates []Candidate) []string {
	filtered := make([]Candidate, 0, len(candidates))
	for _, c := range candidates {
		if c.Blocked || c.Muted || c.NotInterested || c.Hidden {
			continue
		}
		filtered = append(filtered, c)
	}
	sort.SliceStable(filtered, func(i, j int) bool {
		if !filtered[i].CreatedAt.Equal(filtered[j].CreatedAt) {
			return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
		}
		return filtered[i].PostID < filtered[j].PostID
	})
	out := make([]string, 0, len(filtered))
	for _, c := range filtered {
		out = append(out, c.PostID)
	}
	return out
}
