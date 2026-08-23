package feedrank

import (
	"fmt"
	"testing"
	"time"
)

var now = time.Date(2026, 8, 23, 12, 0, 0, 0, time.UTC)

func cand(id, author string, ageHours float64, mut func(*Candidate)) Candidate {
	c := Candidate{
		PostID:    id,
		AuthorID:  author,
		CreatedAt: now.Add(-time.Duration(ageHours * float64(time.Hour))),
	}
	if mut != nil {
		mut(&c)
	}
	return c
}

func ids(s []Scored) []string {
	out := make([]string, 0, len(s))
	for _, x := range s {
		out = append(out, x.PostID)
	}
	return out
}

// ── Suppression is absolute ───────────────────────────────────────────────────

// The spec demands user control. A negative signal must remove the item
// outright — not merely down-weight it, where a popular enough post would
// claw its way back into view.
func TestSuppressionIsAbsolute(t *testing.T) {
	flags := map[string]func(*Candidate){
		"blocked":        func(c *Candidate) { c.Blocked = true },
		"muted":          func(c *Candidate) { c.Muted = true },
		"not_interested": func(c *Candidate) { c.NotInterested = true },
		"hidden":         func(c *Candidate) { c.Hidden = true },
	}
	for name, flag := range flags {
		t.Run(name, func(t *testing.T) {
			// Give the suppressed post every advantage possible.
			bad := cand("bad", "a", 0, func(c *Candidate) {
				flag(c)
				c.Affinity = 1
				c.Reactions = 100000
				c.Comments = 100000
				c.Reposts = 100000
				c.HasMedia = true
				c.TextLength = 500
				c.InViewerGroup = true
				c.MatchesInterest = true
			})
			good := cand("good", "b", 100, nil)

			got := Rank([]Candidate{bad, good}, now, DefaultWeights)
			for _, s := range got {
				if s.PostID == "bad" {
					t.Fatalf("%s post survived ranking", name)
				}
			}
			if len(got) != 1 || got[0].PostID != "good" {
				t.Errorf("result = %v, want only the good post", ids(got))
			}
		})
	}
}

func TestChronologicalAlsoRespectsSuppression(t *testing.T) {
	got := ChronologicalIDs([]Candidate{
		cand("blocked", "a", 0, func(c *Candidate) { c.Blocked = true }),
		cand("ok", "b", 1, nil),
	})
	if len(got) != 1 || got[0] != "ok" {
		t.Errorf("ChronologicalIDs = %v, want [ok]", got)
	}
}

// ── Anti-virality ─────────────────────────────────────────────────────────────

// Engagement must be compressed hard enough that a viral post from a stranger
// cannot outrank fresh content from a close connection. This is the core
// anti-addiction property.
func TestViralStrangerDoesNotOutrankFreshFriend(t *testing.T) {
	viral := cand("viral", "stranger", 30, func(c *Candidate) {
		c.Affinity = 0.05
		c.Reactions = 5000
		c.Comments = 900
		c.Reposts = 400
	})
	friend := cand("friend", "close", 1, func(c *Candidate) {
		c.Affinity = 0.95
		c.Reactions = 2
	})
	got := Rank([]Candidate{viral, friend}, now, DefaultWeights)
	if got[0].PostID != "friend" {
		t.Errorf("order = %v; a viral stranger outranked a fresh close connection", ids(got))
	}
}

// Engagement saturates: 100x the reactions must not yield anything close to
// 100x the contribution.
func TestEngagementSaturates(t *testing.T) {
	small := engagementScore(10, 0, 0)
	large := engagementScore(1000, 0, 0)
	huge := engagementScore(100000, 0, 0)

	if large <= small {
		t.Error("more engagement should score higher")
	}
	if huge > 1.0 || large > 1.0 {
		t.Errorf("engagement exceeded 1.0: large=%v huge=%v", large, huge)
	}
	if large/small > 4 {
		t.Errorf("engagement scaled %.1fx for 100x the reactions — not compressed enough", large/small)
	}
	if engagementScore(0, 0, 0) != 0 {
		t.Error("zero engagement should score zero")
	}
}

func TestCommentsWeighMoreThanReactions(t *testing.T) {
	if engagementScore(0, 10, 0) <= engagementScore(10, 0, 0) {
		t.Error("10 comments should signal more investment than 10 reactions")
	}
}

// ── Recency ───────────────────────────────────────────────────────────────────

func TestRecencyDecays(t *testing.T) {
	fresh := recencyScore(0)
	half := recencyScore(RecencyHalfLife)
	old := recencyScore(10 * 24 * time.Hour)

	if fresh != 1.0 {
		t.Errorf("a brand-new post scored %v, want 1.0", fresh)
	}
	if half < 0.49 || half > 0.51 {
		t.Errorf("score at the half-life = %v, want ~0.5", half)
	}
	if old >= 0.05 {
		t.Errorf("a 10-day-old post scored %v, want it well decayed", old)
	}
}

// A post with a future timestamp (client clock skew) must not score infinitely
// or sort above everything forever.
func TestFutureTimestampIsClamped(t *testing.T) {
	if got := recencyScore(-48 * time.Hour); got != 1.0 {
		t.Errorf("a future-dated post scored %v, want it clamped to 1.0", got)
	}
}

// ── Diversity ─────────────────────────────────────────────────────────────────

// The structural guarantee: one prolific author cannot own the top of the
// feed, no matter how well their posts score.
//
// The cap is asserted over the region where it is actually achievable — while
// candidates from other authors remain. Once only one author's posts are left
// they must be emitted consecutively, because the alternative is dropping
// them. TestDiversityLosesNothing covers that side.
func TestOneAuthorCannotDominateTheWindow(t *testing.T) {
	const loudCount, otherCount = 20, 20
	var candidates []Candidate
	// Excellent posts from one author.
	for i := 0; i < loudCount; i++ {
		candidates = append(candidates, cand(fmt.Sprintf("loud%d", i), "loud", 0.1, func(c *Candidate) {
			c.Affinity = 1
			c.Reactions = 500
			c.HasMedia = true
			c.TextLength = 400
		}))
	}
	// Ordinary posts from other authors.
	for i := 0; i < otherCount; i++ {
		candidates = append(candidates, cand(fmt.Sprintf("other%d", i), fmt.Sprintf("u%d", i), 2, func(c *Candidate) {
			c.Affinity = 0.5
		}))
	}

	got := Rank(candidates, now, DefaultWeights)

	// Find where the pool stops being mixed: the last index at which a post
	// from a non-"loud" author appears.
	lastDiverse := -1
	for i, s := range got {
		if s.AuthorID != "loud" {
			lastDiverse = i
		}
	}

	for start := 0; start+DiversityWindow <= lastDiverse+1; start++ {
		counts := map[string]int{}
		for _, s := range got[start : start+DiversityWindow] {
			counts[s.AuthorID]++
		}
		for author, n := range counts {
			if n > MaxPerAuthorInWindow {
				t.Fatalf("author %q holds %d of %d slots starting at %d (cap %d) while other authors remained",
					author, n, DiversityWindow, start, MaxPerAuthorInWindow)
			}
		}
	}

	// The concrete promise to a reader: the first screenful is diverse.
	firstScreen := got
	if len(firstScreen) > DiversityWindow {
		firstScreen = firstScreen[:DiversityWindow]
	}
	loudInFirstScreen := 0
	for _, s := range firstScreen {
		if s.AuthorID == "loud" {
			loudInFirstScreen++
		}
	}
	if loudInFirstScreen > MaxPerAuthorInWindow {
		t.Errorf("the loud author took %d of the first %d slots, cap is %d",
			loudInFirstScreen, len(firstScreen), MaxPerAuthorInWindow)
	}
}

// A feed made up entirely of one author must still return every post, in
// score order, rather than dropping the ones that cannot be spaced out.
func TestSingleAuthorFeedIsNotTruncated(t *testing.T) {
	var candidates []Candidate
	for i := 0; i < 25; i++ {
		candidates = append(candidates, cand(fmt.Sprintf("p%d", i), "solo", float64(i), nil))
	}
	got := Rank(candidates, now, DefaultWeights)
	if len(got) != len(candidates) {
		t.Fatalf("single-author feed returned %d of %d posts", len(got), len(candidates))
	}
	for i := 1; i < len(got); i++ {
		if got[i].Score > got[i-1].Score {
			t.Fatalf("single-author feed not in score order at %d", i)
		}
	}
}

// Diversity reorders; it must never silently delete a post.
func TestDiversityLosesNothing(t *testing.T) {
	var candidates []Candidate
	for i := 0; i < 30; i++ {
		candidates = append(candidates, cand(fmt.Sprintf("p%d", i), "same-author", float64(i), nil))
	}
	got := Rank(candidates, now, DefaultWeights)
	if len(got) != len(candidates) {
		t.Fatalf("ranked %d posts from %d candidates — posts were dropped", len(got), len(candidates))
	}
	seen := map[string]bool{}
	for _, s := range got {
		if seen[s.PostID] {
			t.Fatalf("post %s appeared twice", s.PostID)
		}
		seen[s.PostID] = true
	}
}

// ── Determinism (pagination correctness) ──────────────────────────────────────

// An unstable sort would let a post appear on page 1 and again on page 2, or
// vanish between them. Ranking must be a pure function of its inputs.
func TestRankIsDeterministic(t *testing.T) {
	var candidates []Candidate
	for i := 0; i < 40; i++ {
		candidates = append(candidates, cand(fmt.Sprintf("p%d", i), fmt.Sprintf("a%d", i%7), float64(i%5), func(c *Candidate) {
			c.Affinity = float64(i%4) / 4
			c.Reactions = i * 3
		}))
	}
	first := ids(Rank(candidates, now, DefaultWeights))
	for i := 0; i < 20; i++ {
		got := ids(Rank(candidates, now, DefaultWeights))
		if len(got) != len(first) {
			t.Fatalf("length changed between runs")
		}
		for j := range got {
			if got[j] != first[j] {
				t.Fatalf("order changed at %d: %s then %s", j, first[j], got[j])
			}
		}
	}
}

// Identical posts must break ties by id, never by map iteration order.
func TestIdenticalCandidatesTieBreakStably(t *testing.T) {
	a := cand("aaa", "x", 1, nil)
	b := cand("bbb", "y", 1, nil)
	got := ids(Rank([]Candidate{b, a}, now, DefaultWeights))
	if got[0] != "aaa" {
		t.Errorf("tie-break order = %v, want the lower id first", got)
	}
}

// ── Score properties ──────────────────────────────────────────────────────────

func TestScoreStaysInRange(t *testing.T) {
	extreme := cand("x", "a", 0, func(c *Candidate) {
		c.Affinity = 1
		c.Reactions = 1 << 20
		c.Comments = 1 << 20
		c.Reposts = 1 << 20
		c.TextLength = 100000
		c.HasMedia, c.HasLink, c.HasPoll = true, true, true
		c.InViewerGroup, c.MatchesInterest = true, true
	})
	s := Score(extreme, now, DefaultWeights)
	if s.Score < 0 || s.Score > 1.2 {
		t.Errorf("maximal score = %v, outside the interpretable range", s.Score)
	}

	empty := Score(cand("y", "b", 1000, nil), now, DefaultWeights)
	if empty.Score < 0 {
		t.Errorf("minimal score = %v, want >= 0", empty.Score)
	}
}

// The breakdown is what makes ranking auditable; it must actually sum to the
// score, or the explanation is a lie.
func TestExplainSumsToScore(t *testing.T) {
	c := cand("x", "a", 3, func(c *Candidate) {
		c.Affinity = 0.7
		c.Reactions = 20
		c.Comments = 4
		c.HasMedia = true
		c.TextLength = 200
		c.InViewerGroup = true
		c.MatchesInterest = true
	})
	s := Score(c, now, DefaultWeights)
	sum := 0.0
	for _, v := range s.Explain {
		sum += v
	}
	if diff := sum - s.Score; diff > 1e-9 || diff < -1e-9 {
		t.Errorf("Explain sums to %v but Score is %v", sum, s.Score)
	}
}

func TestSeenPostsAreDemotedNotRemoved(t *testing.T) {
	fresh := cand("unseen", "a", 1, func(c *Candidate) { c.Affinity = 0.5 })
	seen := cand("seen", "b", 1, func(c *Candidate) { c.Affinity = 0.5; c.Seen = true })

	got := Rank([]Candidate{seen, fresh}, now, DefaultWeights)
	if len(got) != 2 {
		t.Fatalf("a seen post was removed; got %v", ids(got))
	}
	if got[0].PostID != "unseen" {
		t.Errorf("order = %v, want the unseen post first", ids(got))
	}
}

func TestQualityRewardsSubstance(t *testing.T) {
	thin := qualityScore(Candidate{TextLength: 3})
	rich := qualityScore(Candidate{TextLength: 400, HasMedia: true, HasLink: true})
	if rich <= thin {
		t.Error("a substantial post should outscore a one-word post on quality")
	}
	if rich > 1.0 {
		t.Errorf("quality = %v, want it capped at 1.0", rich)
	}
}

func TestRankHandlesEmptyAndSingle(t *testing.T) {
	if got := Rank(nil, now, DefaultWeights); len(got) != 0 {
		t.Errorf("Rank(nil) = %v", ids(got))
	}
	if got := Rank([]Candidate{}, now, DefaultWeights); len(got) != 0 {
		t.Errorf("Rank(empty) = %v", ids(got))
	}
	one := []Candidate{cand("only", "a", 1, nil)}
	if got := Rank(one, now, DefaultWeights); len(got) != 1 || got[0].PostID != "only" {
		t.Errorf("Rank(single) = %v", ids(got))
	}
}

func TestDefaultWeightsAreSane(t *testing.T) {
	w := DefaultWeights
	// Recency and affinity must together dominate, or the feed becomes a
	// popularity contest rather than a picture of the viewer's campus.
	if w.Recency+w.Affinity <= w.Engagement+w.Quality+w.GroupBoost+w.FollowedTopic {
		t.Error("engagement-driven signals outweigh recency+affinity")
	}
	if w.Engagement > w.Recency {
		t.Error("engagement outweighs recency; the feed would favour viral over current")
	}
	for name, v := range map[string]float64{
		"Recency": w.Recency, "Affinity": w.Affinity, "Engagement": w.Engagement,
		"Quality": w.Quality, "GroupBoost": w.GroupBoost, "FollowedTopic": w.FollowedTopic,
	} {
		if v < 0 {
			t.Errorf("weight %s is negative (%v)", name, v)
		}
	}
}
