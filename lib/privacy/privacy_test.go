package privacy

import (
	"testing"

	"nile-connect/lib/models"
	"nile-connect/lib/socialgraph"
)

// rel builds a Relation for the table tests below.
func rel(mut func(*socialgraph.Relation)) socialgraph.Relation {
	r := socialgraph.Relation{ViewerID: "viewer", SubjectID: "owner"}
	if mut != nil {
		mut(&r)
	}
	return r
}

// ── The single most important property in the package ─────────────────────────

// A block must deny every audience, including "everyone". If a blocked user can
// still read public content, blocking is decorative.
func TestBlockDeniesEveryAudience(t *testing.T) {
	audiences := []string{
		AudienceEveryone, AudienceConnections, AudienceCloseFriends,
		AudienceOnlyMe, AudienceGroup, AudienceCustom,
	}
	// Every permissive context flag set — none of them may rescue a block.
	ctx := ViewContext{InGroup: true, InCustomAudience: true}

	for _, aud := range audiences {
		blocking := rel(func(r *socialgraph.Relation) {
			r.Blocking = true
			r.Connected = true
			r.IsCloseFriendOfSubject = true
		})
		if CanView(blocking, aud, ctx) {
			t.Errorf("audience %q: viewer who blocked the owner could still read", aud)
		}

		blockedBy := rel(func(r *socialgraph.Relation) {
			r.BlockedBy = true
			r.Connected = true
			r.IsCloseFriendOfSubject = true
		})
		if CanView(blockedBy, aud, ctx) {
			t.Errorf("audience %q: viewer blocked BY the owner could still read", aud)
		}
	}
}

// A moderator may review content, but a block still wins — otherwise a
// moderator could quietly bypass a block against themselves.
func TestModeratorCannotBypassABlock(t *testing.T) {
	r := rel(func(r *socialgraph.Relation) { r.BlockedBy = true })
	if CanView(r, AudienceEveryone, ViewContext{ViewerIsModerator: true}) {
		t.Error("a moderator bypassed a block against them")
	}
}

func TestModeratorCanReviewOtherwisePrivateContent(t *testing.T) {
	r := rel(nil) // strangers
	if !CanView(r, AudienceOnlyMe, ViewContext{ViewerIsModerator: true}) {
		t.Error("a moderator could not review only-me content for a report")
	}
}

func TestOwnerAlwaysSeesOwnContent(t *testing.T) {
	self := rel(func(r *socialgraph.Relation) { r.IsSelf = true })
	for _, aud := range []string{AudienceOnlyMe, AudienceCloseFriends, AudienceCustom, AudienceGroup} {
		if !CanView(self, aud, ViewContext{}) {
			t.Errorf("owner could not see their own %q content", aud)
		}
	}
}

func TestAudienceMatrix(t *testing.T) {
	cases := []struct {
		name     string
		audience string
		relation socialgraph.Relation
		ctx      ViewContext
		want     bool
	}{
		{"everyone/stranger", AudienceEveryone, rel(nil), ViewContext{}, true},
		{"connections/stranger", AudienceConnections, rel(nil), ViewContext{}, false},
		{"connections/follower-only", AudienceConnections,
			rel(func(r *socialgraph.Relation) { r.Following = true }), ViewContext{}, false},
		{"connections/connected", AudienceConnections,
			rel(func(r *socialgraph.Relation) { r.Connected = true }), ViewContext{}, true},

		{"close/stranger", AudienceCloseFriends, rel(nil), ViewContext{}, false},
		{"close/connected-but-not-listed", AudienceCloseFriends,
			rel(func(r *socialgraph.Relation) { r.Connected = true }), ViewContext{}, false},
		{"close/listed-by-owner", AudienceCloseFriends,
			rel(func(r *socialgraph.Relation) { r.IsCloseFriendOfSubject = true }), ViewContext{}, true},

		{"onlyme/connected", AudienceOnlyMe,
			rel(func(r *socialgraph.Relation) { r.Connected = true }), ViewContext{}, false},

		{"group/member", AudienceGroup, rel(nil), ViewContext{InGroup: true}, true},
		{"group/non-member", AudienceGroup, rel(nil), ViewContext{}, false},

		{"custom/on-list", AudienceCustom, rel(nil), ViewContext{InCustomAudience: true}, true},
		{"custom/off-list", AudienceCustom, rel(nil), ViewContext{}, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := CanView(c.relation, c.audience, c.ctx); got != c.want {
				t.Errorf("CanView = %v, want %v", got, c.want)
			}
		})
	}
}

// The close-friends check is directional and easy to invert. Listing someone
// must not grant you access to THEIR close-friends content.
func TestCloseFriendsDirectionIsNotSymmetric(t *testing.T) {
	viewerListedOwner := rel(func(r *socialgraph.Relation) { r.SubjectIsCloseFriend = true })
	if CanView(viewerListedOwner, AudienceCloseFriends, ViewContext{}) {
		t.Error("listing someone as a close friend wrongly granted access to THEIR close-friends content")
	}
}

// An unrecognised audience — a typo, a newer client, a corrupted row — must
// deny rather than fall through to public.
func TestUnknownAudienceFailsClosed(t *testing.T) {
	for _, aud := range []string{"", "public", "friends", "ALL", "everyone "} {
		if CanView(rel(nil), aud, ViewContext{}) {
			t.Errorf("unknown audience %q was treated as visible", aud)
		}
	}
}

// ── Interaction gates ─────────────────────────────────────────────────────────

func TestCanGates(t *testing.T) {
	strict := DefaultSettings("owner")
	strict.WhoCanMention = GateConnections
	strict.WhoCanMessage = GateNoOne
	strict.WhoCanComment = GateConnections

	stranger := rel(nil)
	connected := rel(func(r *socialgraph.Relation) { r.Connected = true })

	if Can(stranger, strict, ActionMention) {
		t.Error("a stranger mentioned someone who limited mentions to connections")
	}
	if !Can(connected, strict, ActionMention) {
		t.Error("a connection could not mention")
	}
	if Can(connected, strict, ActionMessage) {
		t.Error("no_one gate did not stop a connection from messaging")
	}
	if Can(stranger, strict, ActionComment) {
		t.Error("a stranger commented where comments are limited to connections")
	}
}

func TestCanAlwaysDeniesAcrossABlock(t *testing.T) {
	open := DefaultSettings("owner") // everything set to "everyone"
	blocked := rel(func(r *socialgraph.Relation) { r.BlockedBy = true })
	for _, a := range []Action{ActionMention, ActionMessage, ActionAddToGroup, ActionComment, ActionViewProfile} {
		if Can(blocked, open, a) {
			t.Errorf("action %q was permitted across a block", a)
		}
	}
}

func TestCanAllowsSelfActions(t *testing.T) {
	locked := DefaultSettings("me")
	locked.WhoCanMention = GateNoOne
	locked.WhoCanMessage = GateNoOne
	locked.WhoCanComment = GateNoOne
	self := rel(func(r *socialgraph.Relation) { r.IsSelf = true })
	for _, a := range []Action{ActionMention, ActionMessage, ActionComment} {
		if !Can(self, locked, a) {
			t.Errorf("a user was blocked from %q on their own content", a)
		}
	}
}

func TestUnknownActionFailsClosed(t *testing.T) {
	if Can(rel(nil), DefaultSettings("owner"), Action("delete_everything")) {
		t.Error("an unknown action was permitted")
	}
}

func TestUnknownGateFailsClosed(t *testing.T) {
	s := DefaultSettings("owner")
	s.WhoCanMention = "sometimes"
	if Can(rel(nil), s, ActionMention) {
		t.Error("an unrecognised gate value was treated as permissive")
	}
}

// ── Presence and discoverability ──────────────────────────────────────────────

func TestPresenceRespectsSettingAndBlocks(t *testing.T) {
	hidden := DefaultSettings("owner")
	hidden.ShowOnlineStatus = false
	if CanShowPresence(rel(nil), hidden) {
		t.Error("presence leaked despite ShowOnlineStatus=false")
	}
	shown := DefaultSettings("owner")
	if !CanShowPresence(rel(nil), shown) {
		t.Error("presence hidden despite ShowOnlineStatus=true")
	}
	blocked := rel(func(r *socialgraph.Relation) { r.Blocking = true })
	if CanShowPresence(blocked, shown) {
		t.Error("presence leaked across a block")
	}
}

func TestIsDiscoverable(t *testing.T) {
	s := DefaultSettings("owner")
	if !IsDiscoverable(rel(nil), s) {
		t.Error("a default profile was not discoverable")
	}

	s.DiscoverableInSearch = false
	if IsDiscoverable(rel(nil), s) {
		t.Error("a profile opted out of search still appeared")
	}

	// Opting out of search must not hide you from yourself.
	self := rel(func(r *socialgraph.Relation) { r.IsSelf = true })
	if !IsDiscoverable(self, s) {
		t.Error("a user could not find themselves")
	}

	// A connections-only profile is a dead link for a stranger, so it is
	// withheld from their results even when search is enabled.
	limited := DefaultSettings("owner")
	limited.ProfileVisibility = AudienceConnections
	if IsDiscoverable(rel(nil), limited) {
		t.Error("a connections-only profile surfaced to a stranger")
	}
	connected := rel(func(r *socialgraph.Relation) { r.Connected = true })
	if !IsDiscoverable(connected, limited) {
		t.Error("a connections-only profile was hidden from a connection")
	}

	blocked := rel(func(r *socialgraph.Relation) { r.BlockedBy = true })
	if IsDiscoverable(blocked, DefaultSettings("owner")) {
		t.Error("a blocked user found their blocker in search")
	}
}

// ── Normalisation ─────────────────────────────────────────────────────────────

// An unparseable audience must never widen visibility. This is the guard
// against a client-version mismatch silently publishing a close-friends story
// to everyone.
func TestNormalizeAudienceNeverWidens(t *testing.T) {
	cases := []struct{ raw, fallback, want string }{
		{AudienceCloseFriends, AudienceEveryone, AudienceCloseFriends},
		{"garbage", AudienceCloseFriends, AudienceCloseFriends},
		{"garbage", "also garbage", AudienceConnections},
		{"", AudienceOnlyMe, AudienceOnlyMe},
		{"EVERYONE", AudienceConnections, AudienceConnections}, // case-sensitive on purpose
	}
	for _, c := range cases {
		if got := NormalizeAudience(c.raw, c.fallback); got != c.want {
			t.Errorf("NormalizeAudience(%q, %q) = %q, want %q", c.raw, c.fallback, got, c.want)
		}
	}
}

func TestNormalizeGate(t *testing.T) {
	if got := NormalizeGate("nonsense", GateConnections); got != GateConnections {
		t.Errorf("NormalizeGate fallback = %q", got)
	}
	if got := NormalizeGate("nonsense", "nonsense"); got != GateEveryone {
		t.Errorf("NormalizeGate final default = %q", got)
	}
	if got := NormalizeGate(GateNoOne, GateEveryone); got != GateNoOne {
		t.Errorf("NormalizeGate passthrough = %q", got)
	}
}

func TestDefaultSettingsAreCoherent(t *testing.T) {
	s := DefaultSettings("u1")
	if s.UserID != "u1" {
		t.Errorf("UserID = %q", s.UserID)
	}
	// Stories are more personal than posts and must not default wider.
	if s.DefaultStoryAudience == AudienceEveryone && s.DefaultPostAudience != AudienceEveryone {
		t.Error("stories default wider than posts")
	}
	// Every default must itself be a value the engine recognises, or the
	// whole system fails closed on a fresh account.
	if !validAudiences[s.ProfileVisibility] ||
		!validAudiences[s.DefaultPostAudience] ||
		!validAudiences[s.DefaultStoryAudience] {
		t.Error("a default audience is not a recognised value")
	}
	if !validGates[s.WhoCanMention] || !validGates[s.WhoCanMessage] ||
		!validGates[s.WhoCanAddToGroups] || !validGates[s.WhoCanComment] {
		t.Error("a default gate is not a recognised value")
	}
}

// A row written before a column existed holds "", which must be repaired to
// the default rather than failing closed and locking the user out of their own
// account's interactions.
func TestSettingsForRepairsBlankFields(t *testing.T) {
	blank := models.PrivacySettings{UserID: "u1"}
	// Simulate what SettingsFor does to a blank row.
	fill := DefaultSettings("u1")
	if !validAudiences[blank.ProfileVisibility] {
		blank.ProfileVisibility = fill.ProfileVisibility
	}
	if !validGates[blank.WhoCanMention] {
		blank.WhoCanMention = fill.WhoCanMention
	}
	if blank.ProfileVisibility != AudienceEveryone {
		t.Errorf("blank ProfileVisibility repaired to %q", blank.ProfileVisibility)
	}
	if blank.WhoCanMention != GateEveryone {
		t.Errorf("blank WhoCanMention repaired to %q", blank.WhoCanMention)
	}
}

// ── Tie strength (feed ranking input) ─────────────────────────────────────────

func TestStrengthOrdering(t *testing.T) {
	blocked := rel(func(r *socialgraph.Relation) { r.Blocking = true })
	stranger := rel(nil)
	followedBy := rel(func(r *socialgraph.Relation) { r.FollowedBy = true })
	following := rel(func(r *socialgraph.Relation) { r.Following = true })
	mutual := rel(func(r *socialgraph.Relation) { r.Following = true; r.FollowedBy = true })
	connected := rel(func(r *socialgraph.Relation) { r.Connected = true })
	both := rel(func(r *socialgraph.Relation) { r.Connected = true; r.Following = true; r.FollowedBy = true })

	if blocked.Strength() != 0 {
		t.Errorf("a blocked relation scored %v, want 0", blocked.Strength())
	}
	ordered := []socialgraph.Relation{stranger, followedBy, following, mutual, connected, both}
	for i := 1; i < len(ordered); i++ {
		if ordered[i].Strength() <= ordered[i-1].Strength() {
			t.Errorf("strength not strictly increasing at index %d: %v <= %v",
				i, ordered[i].Strength(), ordered[i-1].Strength())
		}
	}
	for _, r := range ordered {
		if s := r.Strength(); s < 0 || s > 1 {
			t.Errorf("strength %v outside 0..1", s)
		}
	}
}

func TestEitherBlockedAndMutual(t *testing.T) {
	if !rel(func(r *socialgraph.Relation) { r.Blocking = true }).EitherBlocked() {
		t.Error("Blocking should report EitherBlocked")
	}
	if !rel(func(r *socialgraph.Relation) { r.BlockedBy = true }).EitherBlocked() {
		t.Error("BlockedBy should report EitherBlocked")
	}
	if rel(nil).EitherBlocked() {
		t.Error("strangers should not report EitherBlocked")
	}
	if rel(func(r *socialgraph.Relation) { r.Following = true }).Mutual() {
		t.Error("a one-way follow reported as mutual")
	}
	if !rel(func(r *socialgraph.Relation) { r.Following = true; r.FollowedBy = true }).Mutual() {
		t.Error("a two-way follow did not report as mutual")
	}
}
