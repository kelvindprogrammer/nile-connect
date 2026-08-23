package groups

import (
	"strings"
	"testing"
	"time"

	"nile-connect/lib/models"
)

func member(role, status string) Membership {
	return Membership{Found: true, Role: role, Status: status}
}

// ── Role hierarchy ────────────────────────────────────────────────────────────

func TestRoleRankIsStrictlyOrdered(t *testing.T) {
	if !(roleRank[RoleOwner] > roleRank[RoleAdmin] &&
		roleRank[RoleAdmin] > roleRank[RoleModerator] &&
		roleRank[RoleModerator] > roleRank[RoleMember]) {
		t.Fatalf("role ranks are not strictly ordered: %v", roleRank)
	}
	if roleRank[RoleMember] <= 0 {
		t.Error("member rank must be positive so an active member outranks a non-member")
	}
}

// A non-active member has rank 0 whatever their stored role, so a banned
// ex-admin cannot act.
func TestInactiveMembersHaveNoRank(t *testing.T) {
	for _, status := range []string{StatusPending, StatusBanned, StatusLeft} {
		m := member(RoleAdmin, status)
		if m.Rank() != 0 {
			t.Errorf("a %s admin has rank %d, want 0", status, m.Rank())
		}
		if m.CanModerate() || m.CanAdminister() {
			t.Errorf("a %s admin can still act", status)
		}
	}
	var none Membership
	if none.Rank() != 0 || none.IsActive() {
		t.Error("a non-member has rank or is active")
	}
}

func TestPermissionThresholds(t *testing.T) {
	cases := []struct {
		role            string
		moderate, admin bool
	}{
		{RoleOwner, true, true},
		{RoleAdmin, true, true},
		{RoleModerator, true, false},
		{RoleMember, false, false},
	}
	for _, c := range cases {
		m := member(c.role, StatusActive)
		if m.CanModerate() != c.moderate {
			t.Errorf("%s CanModerate = %v, want %v", c.role, m.CanModerate(), c.moderate)
		}
		if m.CanAdminister() != c.admin {
			t.Errorf("%s CanAdminister = %v, want %v", c.role, m.CanAdminister(), c.admin)
		}
	}
}

// ── Posting rules ─────────────────────────────────────────────────────────────

// An announcement group must not let ordinary members post, or the whole
// point of the group kind is lost.
func TestAnnouncementGroupsRestrictPosting(t *testing.T) {
	announce := &models.Group{Kind: KindAnnouncement}
	discussion := &models.Group{Kind: KindDiscussion}

	if member(RoleMember, StatusActive).CanPost(announce) {
		t.Error("a member could post in an announcement group")
	}
	if member(RoleModerator, StatusActive).CanPost(announce) {
		t.Error("a moderator could post in an announcement group (admin+ only)")
	}
	if !member(RoleAdmin, StatusActive).CanPost(announce) {
		t.Error("an admin could not post in an announcement group")
	}
	if !member(RoleMember, StatusActive).CanPost(discussion) {
		t.Error("a member could not post in a discussion group")
	}
}

func TestNonMembersCannotPost(t *testing.T) {
	g := &models.Group{Kind: KindDiscussion}
	var none Membership
	if none.CanPost(g) {
		t.Error("a non-member could post")
	}
	for _, status := range []string{StatusPending, StatusBanned, StatusLeft} {
		if member(RoleMember, status).CanPost(g) {
			t.Errorf("a %s member could post", status)
		}
	}
}

// A timed mute must actually silence, and must lapse on its own.
func TestMutedMembersCannotPostUntilTheMuteLapses(t *testing.T) {
	g := &models.Group{Kind: KindDiscussion}

	future := time.Now().Add(time.Hour)
	muted := member(RoleMember, StatusActive)
	muted.MutedUntil = &future
	if muted.CanPost(g) {
		t.Error("a muted member could post")
	}

	past := time.Now().Add(-time.Hour)
	lapsed := member(RoleMember, StatusActive)
	lapsed.MutedUntil = &past
	if !lapsed.CanPost(g) {
		t.Error("a lapsed mute still blocked posting")
	}
}

// ── Visibility ────────────────────────────────────────────────────────────────

// "Private" has to mean invisible, or it means nothing.
func TestPrivateGroupsAreHiddenFromNonMembers(t *testing.T) {
	private := &models.Group{Visibility: VisibilityPrivate, Status: "active"}
	var stranger Membership

	if CanSeeGroup(private, stranger, false) {
		t.Error("a stranger could see a private group")
	}
	if !CanSeeGroup(private, member(RoleMember, StatusActive), false) {
		t.Error("a member could not see their own private group")
	}
	if !CanSeeGroup(private, stranger, true) {
		t.Error("staff could not see a private group for moderation")
	}
}

// A restricted group is findable but its content is not readable until you
// join — that is the difference between the two axes.
func TestRestrictedGroupsHideContentButNotExistence(t *testing.T) {
	restricted := &models.Group{Visibility: VisibilityRestricted, Status: "active"}
	var stranger Membership

	if !CanSeeGroup(restricted, stranger, false) {
		t.Error("a restricted group was hidden from discovery")
	}
	if CanReadPosts(restricted, stranger, false) {
		t.Error("a stranger could read a restricted group's posts")
	}
	if !CanReadPosts(restricted, member(RoleMember, StatusActive), false) {
		t.Error("a member could not read their group's posts")
	}
}

func TestPublicGroupsAreReadableByAnyone(t *testing.T) {
	public := &models.Group{Visibility: VisibilityPublic, Status: "active"}
	var stranger Membership
	if !CanSeeGroup(public, stranger, false) || !CanReadPosts(public, stranger, false) {
		t.Error("a public group was not readable by a stranger")
	}
}

// A suspended group disappears for everyone except staff.
func TestSuspendedGroupsAreHidden(t *testing.T) {
	suspended := &models.Group{Visibility: VisibilityPublic, Status: "suspended"}
	if CanSeeGroup(suspended, member(RoleOwner, StatusActive), false) {
		t.Error("a suspended group was visible to its owner")
	}
	if !CanSeeGroup(suspended, Membership{}, true) {
		t.Error("staff could not see a suspended group")
	}
}

// ── Slugs ─────────────────────────────────────────────────────────────────────

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"CS 101 Study Group": "cs-101-study-group",
		"  Robotics Club!  ": "robotics-club",
		"A---B":              "a-b",
		"###":                "",
		"Ada's Group":        "ada-s-group",
	}
	for in, want := range cases {
		if got := Slugify(in); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSlugifyBoundsLength(t *testing.T) {
	got := Slugify(strings.Repeat("verylongname ", 20))
	if len(got) > 48 {
		t.Errorf("slug length %d exceeds 48: %q", len(got), got)
	}
	if strings.HasSuffix(got, "-") || strings.HasPrefix(got, "-") {
		t.Errorf("slug has a dangling separator: %q", got)
	}
}

func TestSlugifyNeverPanics(t *testing.T) {
	for _, in := range []string{"", "   ", "😀😀", "русский", strings.Repeat("-", 200)} {
		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("Slugify(%q) panicked: %v", in, r)
				}
			}()
			Slugify(in)
		}()
	}
}

func TestRandomTokenIsUniqueAndUrlSafe(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 500; i++ {
		tok := randomToken(8)
		if tok == "" {
			t.Fatal("randomToken returned empty")
		}
		if seen[tok] {
			t.Fatalf("randomToken collided after %d draws: %q", i, tok)
		}
		seen[tok] = true
		for _, r := range tok {
			if !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')) {
				t.Fatalf("token %q contains a non-url-safe rune %q", tok, r)
			}
		}
	}
}

// ── Enum validation ───────────────────────────────────────────────────────────

// Unrecognised enum values must never reach the database, because the
// visibility checks would then compare against a value they do not know.
func TestEnumValidationRejectsUnknownValues(t *testing.T) {
	for _, v := range []string{"", "secret", "PUBLIC", "open"} {
		if validVisibility[v] {
			t.Errorf("%q was accepted as a visibility", v)
		}
	}
	for _, v := range []string{"", "anyone", "OPEN"} {
		if validJoinPolicy[v] {
			t.Errorf("%q was accepted as a join policy", v)
		}
	}
	for _, v := range []string{"", "chat", "DISCUSSION"} {
		if validKinds[v] {
			t.Errorf("%q was accepted as a group kind", v)
		}
	}
	for _, v := range []string{"", "superadmin", "OWNER"} {
		if validRoles[v] {
			t.Errorf("%q was accepted as a role", v)
		}
	}
}

func TestEveryDeclaredConstantIsValid(t *testing.T) {
	for _, v := range []string{VisibilityPublic, VisibilityRestricted, VisibilityPrivate} {
		if !validVisibility[v] {
			t.Errorf("declared visibility %q fails validation", v)
		}
	}
	for _, v := range []string{JoinOpen, JoinRequest, JoinInviteOnly} {
		if !validJoinPolicy[v] {
			t.Errorf("declared join policy %q fails validation", v)
		}
	}
	for _, v := range []string{KindDiscussion, KindAnnouncement, KindQA, KindResource} {
		if !validKinds[v] {
			t.Errorf("declared kind %q fails validation", v)
		}
	}
	for _, v := range []string{RoleOwner, RoleAdmin, RoleModerator, RoleMember} {
		if !validRoles[v] {
			t.Errorf("declared role %q fails validation", v)
		}
		if roleRank[v] == 0 {
			t.Errorf("declared role %q has no rank", v)
		}
	}
}
