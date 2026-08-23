package moderation

import (
	"testing"
	"time"
)

func TestReasonCatalogIsComplete(t *testing.T) {
	if len(ReasonCatalog()) == 0 {
		t.Fatal("the reason catalog is empty")
	}
	for _, m := range ReasonCatalog() {
		if m.Label == "" {
			t.Errorf("%q has no label", m.Reason)
		}
		if m.Help == "" {
			t.Errorf("%q has no help text", m.Reason)
		}
		if m.Priority <= 0 {
			t.Errorf("%q has priority %d, must be positive", m.Reason, m.Priority)
		}
		if !IsValidReason(string(m.Reason)) {
			t.Errorf("%q is in the catalog but fails IsValidReason", m.Reason)
		}
	}
}

// Safety-critical reports must outrank everything else in the queue, or a
// student in crisis waits behind a pile of spam reports.
func TestSafetyReasonsOutrankNuisanceReasons(t *testing.T) {
	safety := []Reason{ReasonSelfHarm, ReasonViolence, ReasonSexualContent, ReasonHarassment, ReasonHateSpeech}
	nuisance := []Reason{ReasonSpam, ReasonMisinformation, ReasonIntellectualProperty, ReasonOther}

	for _, s := range safety {
		for _, n := range nuisance {
			if PriorityFor(string(s)) <= PriorityFor(string(n)) {
				t.Errorf("%q (%d) does not outrank %q (%d)",
					s, PriorityFor(string(s)), n, PriorityFor(string(n)))
			}
		}
	}
}

func TestSelfHarmIsHighestPriority(t *testing.T) {
	top := PriorityFor(string(ReasonSelfHarm))
	for _, m := range ReasonCatalog() {
		if m.Priority > top {
			t.Errorf("%q outranks self-harm", m.Reason)
		}
	}
	if !IsUrgent(string(ReasonSelfHarm)) {
		t.Error("self-harm is not flagged urgent")
	}
	if IsUrgent(string(ReasonSpam)) {
		t.Error("spam should not be flagged urgent")
	}
}

// An unrecognised reason must not crash or score high; it falls back to Other.
func TestPriorityForUnknownReason(t *testing.T) {
	got := PriorityFor("not-a-real-reason")
	if got != PriorityFor(string(ReasonOther)) {
		t.Errorf("unknown reason scored %d, want the Other priority", got)
	}
	if IsValidReason("not-a-real-reason") {
		t.Error("an unknown reason passed validation")
	}
	if IsValidReason("") {
		t.Error("an empty reason passed validation")
	}
}

func TestValidSubjectsAreConstrained(t *testing.T) {
	for _, s := range []string{SubjectPost, SubjectComment, SubjectStory, SubjectUser, SubjectGroup, SubjectMessage} {
		if !validSubjects[s] {
			t.Errorf("%q should be reportable", s)
		}
	}
	for _, s := range []string{"", "job", "application", "everything"} {
		if validSubjects[s] {
			t.Errorf("%q should not be reportable", s)
		}
	}
}

// Only content types with a moderation_status column may be status-changed;
// otherwise SetContentStatus would silently update nothing.
func TestContentTablesMatchModerableSubjects(t *testing.T) {
	for subject, table := range contentTables {
		if !validSubjects[subject] {
			t.Errorf("%q maps to a table but is not a valid subject", subject)
		}
		if table == "" {
			t.Errorf("%q maps to an empty table name", subject)
		}
	}
	// A user or a group is not "content" and must not be in this map.
	for _, s := range []string{SubjectUser, SubjectGroup} {
		if _, ok := contentTables[s]; ok {
			t.Errorf("%q is in contentTables but is not content", s)
		}
	}
}

// ── Restrictions ──────────────────────────────────────────────────────────────

func TestRestrictionGates(t *testing.T) {
	none := Restrictions{}
	if !none.CanPost() || !none.CanComment() || !none.CanMessage() {
		t.Error("an unrestricted user was gated")
	}
	if none.Any() {
		t.Error("an empty Restrictions reported Any()")
	}

	// A ban must gate everything, not just the one named action.
	banned := Restrictions{Banned: true}
	if banned.CanPost() || banned.CanComment() || banned.CanMessage() {
		t.Error("a banned user could still act")
	}
	if !banned.Any() {
		t.Error("a ban did not report Any()")
	}

	// A targeted restriction gates only its own action.
	postOnly := Restrictions{PostRestricted: true}
	if postOnly.CanPost() {
		t.Error("a post-restricted user could post")
	}
	if !postOnly.CanComment() || !postOnly.CanMessage() {
		t.Error("a post restriction leaked into comments or messages")
	}
}

func TestRestrictionMessageStatesTheExpiry(t *testing.T) {
	if got := (Restrictions{}).RestrictionMessage("post"); got != "" {
		t.Errorf("an unrestricted user got the message %q", got)
	}

	until := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	timed := Restrictions{PostRestricted: true, Until: &until}
	msg := timed.RestrictionMessage("post")
	if msg == "" {
		t.Fatal("a restricted user got no message")
	}
	if !contains(msg, "2026") {
		t.Errorf("message %q does not state when the restriction ends", msg)
	}

	indefinite := Restrictions{Banned: true}
	if m := indefinite.RestrictionMessage("post"); !contains(m, "Career Services") {
		t.Errorf("an indefinite sanction gives no route to appeal: %q", m)
	}
}

func TestValidRestrictionTypes(t *testing.T) {
	for _, r := range []string{RestrictionBanned, RestrictionPost, RestrictionComment, RestrictionMessage} {
		if !validRestrictions[r] {
			t.Errorf("%q should be a valid restriction", r)
		}
	}
	for _, r := range []string{"", "shadowban", "delete"} {
		if validRestrictions[r] {
			t.Errorf("%q should not be a valid restriction", r)
		}
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (func() bool {
		for i := 0; i+len(needle) <= len(haystack); i++ {
			if haystack[i:i+len(needle)] == needle {
				return true
			}
		}
		return false
	})()
}
