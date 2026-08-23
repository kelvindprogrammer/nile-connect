package analytics

import (
	"strings"
	"testing"
)

// The single most important property of this package: it must be structurally
// incapable of storing user-authored content.
//
// Note the SHORT sentence in this table. An earlier implementation gated on
// string length and stored it happily, which is why the rule is now an
// allowlist of reviewed KEY names rather than an inspection of values.
func TestSanitizeDropsContent(t *testing.T) {
	got := sanitize(Props{
		"post_body":    "Hey everyone, here are my full lecture notes for CS101...",
		"message":      "meet me at 3pm behind the library", // only 33 chars
		"search_query": "how to drop out",
		"comment":      "ok", // short, but still content
		"details":      "he keeps messaging me",
		"full_name":    "Ada Bello",
		"email":        "ada@example.com",

		"kind":        "image",
		"media_count": 3,
		"has_poll":    true,
		"duration_ms": 1250.5,
	})

	for _, banned := range []string{
		"post_body", "message", "search_query", "comment", "details", "full_name", "email",
	} {
		if _, present := got[banned]; present {
			t.Errorf("sanitize kept %q — analytics must never store content or PII", banned)
		}
	}
	for _, kept := range []string{"kind", "media_count", "has_poll", "duration_ms"} {
		if _, present := got[kept]; !present {
			t.Errorf("sanitize dropped the safe dimension %q", kept)
		}
	}
}

// An unknown key is dropped even when its value looks harmless, so a new
// caller cannot start recording a dimension nobody reviewed.
func TestSanitizeDropsUnreviewedKeys(t *testing.T) {
	got := sanitize(Props{"some_new_field": "ok", "another": 1})
	if len(got) != 0 {
		t.Errorf("unreviewed keys were kept: %v", got)
	}
}

// Every allowlisted key must actually be usable, or the map is misleading.
func TestAllowlistedKeysAreAccepted(t *testing.T) {
	for key := range allowedProps {
		got := sanitize(Props{key: 1})
		if _, present := got[key]; !present {
			t.Errorf("allowlisted key %q was dropped", key)
		}
	}
}

// A long value under an allowlisted key is dropped rather than truncated:
// a truncated sentence is still content.
func TestSanitizeDropsRatherThanTruncates(t *testing.T) {
	got := sanitize(Props{"kind": strings.Repeat("x", maxPropValueLen+1)})
	if v, present := got["kind"]; present {
		t.Errorf("long value was kept as %q, want it dropped entirely", v)
	}
}

func TestSanitizeKeepsShortEnums(t *testing.T) {
	got := sanitize(Props{"reaction": "celebrate", "audience": "close_friends"})
	if got["reaction"] != "celebrate" || got["audience"] != "close_friends" {
		t.Errorf("short enum values were dropped: %v", got)
	}
}

// Even under an allowlisted key, a map or slice is rejected: either could
// nest arbitrary content inside a name that looks safe.
func TestSanitizeRejectsComplexTypes(t *testing.T) {
	got := sanitize(Props{
		"kind":  map[string]string{"body": "secret text"},
		"count": []string{"secret", "text"},
		"total": 1, // allowlisted key, scalar value — kept
	})
	if _, present := got["kind"]; present {
		t.Error("a nested map was kept under an allowlisted key")
	}
	if _, present := got["count"]; present {
		t.Error("a slice was kept under an allowlisted key")
	}
	if got["total"] != 1 {
		t.Error("an allowlisted key with a scalar value was dropped")
	}
}

func TestSanitizeHandlesEmpty(t *testing.T) {
	if len(sanitize(Props{})) != 0 {
		t.Error("empty props produced output")
	}
	if len(sanitize(nil)) != 0 {
		t.Error("nil props produced output")
	}
}

// Nil-database calls must be no-ops, not panics: Track is called from paths
// that run before or without a database connection.
func TestTrackIsSafeWithNilDB(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("Track panicked on a nil database: %v", r)
		}
	}()
	Track(nil, "u1", PostCreated, "post", "p1", Props{"kind": "text"})
	if got := Since(nil, 24); len(got) != 0 {
		t.Error("Since on a nil database returned rows")
	}
	if got := ActiveUsers(nil, 24); got != 0 {
		t.Errorf("ActiveUsers on a nil database returned %d", got)
	}
}

// Every event name must be a non-empty, lowercase snake_case identifier, so
// dashboard queries can rely on the shape.
func TestEventNamesAreWellFormed(t *testing.T) {
	names := []string{
		PostCreated, PostReacted, PostReposted, PostCommented, PostBookmarked, PostHidden,
		FeedViewed, UserFollowed, UserBlocked, UserMuted,
		StoryCreated, StoryViewed, StoryCompleted,
		GroupCreated, GroupJoined, CommunityJoined,
		ReportSubmitted, ContentModerated, UserRestricted,
		PrivacyChanged, MediaUploaded,
	}
	seen := map[string]bool{}
	for _, n := range names {
		if n == "" {
			t.Error("an event name is empty")
			continue
		}
		if seen[n] {
			t.Errorf("duplicate event name %q", n)
		}
		seen[n] = true
		if n != strings.ToLower(n) {
			t.Errorf("event name %q is not lowercase", n)
		}
		if strings.ContainsAny(n, " -.") {
			t.Errorf("event name %q should be snake_case", n)
		}
	}
}
