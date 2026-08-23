// Package privacy decides who may see what, and who may interact with whom.
//
// Every decision here is made server-side. The spec is explicit that frontend
// restrictions are not sufficient, and the previous feed proved the point: it
// returned every post to every caller and relied on the UI to be tasteful.
//
// The two entry points are:
//
//	CanView(rel, audience, ownerID)  — read access to a piece of content
//	Can(db, viewer, subject, action) — permission to interact with a person
//
// Both take a socialgraph.Relation that the caller resolved once, so a feed of
// 50 posts makes no additional per-item queries.
package privacy

import (
	"gorm.io/gorm"

	"nile-connect/lib/models"
	"nile-connect/lib/socialgraph"
)

// Audience values, ordered from most open to most closed. These are the
// canonical strings stored in Post.Audience, Story.Audience and the
// PrivacySettings defaults.
const (
	AudienceEveryone     = "everyone"
	AudienceConnections  = "connections"
	AudienceCloseFriends = "close_friends"
	AudienceOnlyMe       = "only_me"
	// AudienceGroup defers the decision to group membership; the caller must
	// supply the membership answer since it is not a user-to-user relation.
	AudienceGroup = "group"
	// AudienceCustom defers to an explicit allow-list (story audiences).
	AudienceCustom = "custom"
)

// Interaction gate values, stored in PrivacySettings.
const (
	GateEveryone    = "everyone"
	GateConnections = "connections"
	GateNoOne       = "no_one"
)

// Action names an interaction whose permission is governed by the subject's
// privacy settings.
type Action string

const (
	ActionMention     Action = "mention"
	ActionMessage     Action = "message"
	ActionAddToGroup  Action = "add_to_group"
	ActionComment     Action = "comment"
	ActionViewProfile Action = "view_profile"
)

var validAudiences = map[string]bool{
	AudienceEveryone: true, AudienceConnections: true,
	AudienceCloseFriends: true, AudienceOnlyMe: true,
	AudienceGroup: true, AudienceCustom: true,
}

var validGates = map[string]bool{
	GateEveryone: true, GateConnections: true, GateNoOne: true,
}

// NormalizeAudience coerces client input to a known audience, defaulting to
// the most private sensible value rather than the most open.
//
// Defaulting closed matters: a typo or a client-version mismatch in an
// audience string must never widen who can see something.
func NormalizeAudience(raw, fallback string) string {
	if validAudiences[raw] {
		return raw
	}
	if validAudiences[fallback] {
		return fallback
	}
	return AudienceConnections
}

// NormalizeGate coerces client input to a known interaction gate.
func NormalizeGate(raw, fallback string) string {
	if validGates[raw] {
		return raw
	}
	if validGates[fallback] {
		return fallback
	}
	return GateEveryone
}

// DefaultSettings are applied to any user who has never opened the privacy
// screen. Chosen to be usable-but-not-exposing: the profile and posts are open
// (this is a campus network, discovery is the point), while stories — which
// are more personal and ephemeral — default to connections only.
func DefaultSettings(userID string) models.PrivacySettings {
	return models.PrivacySettings{
		UserID:               userID,
		ProfileVisibility:    AudienceEveryone,
		DefaultPostAudience:  AudienceEveryone,
		DefaultStoryAudience: AudienceConnections,
		WhoCanMention:        GateEveryone,
		WhoCanMessage:        GateEveryone,
		WhoCanAddToGroups:    GateConnections,
		WhoCanComment:        GateEveryone,
		ShowOnlineStatus:     true,
		ShowActivityStatus:   true,
		DiscoverableInSearch: true,
		AllowStoryResharing:  true,
	}
}

// SettingsFor loads a user's privacy settings, returning defaults when no row
// exists. It does not write — lazily inserting on every read would turn a
// read path into a write path and contend on hot profiles.
func SettingsFor(db *gorm.DB, userID string) models.PrivacySettings {
	if userID == "" {
		return DefaultSettings("")
	}
	var s models.PrivacySettings
	if err := db.Where("user_id = ?", userID).First(&s).Error; err != nil {
		return DefaultSettings(userID)
	}
	// A row written before a field existed can hold "", which must not be
	// interpreted as "deny everything" or "allow everything" by accident.
	fill := DefaultSettings(userID)
	if !validAudiences[s.ProfileVisibility] {
		s.ProfileVisibility = fill.ProfileVisibility
	}
	if !validAudiences[s.DefaultPostAudience] {
		s.DefaultPostAudience = fill.DefaultPostAudience
	}
	if !validAudiences[s.DefaultStoryAudience] {
		s.DefaultStoryAudience = fill.DefaultStoryAudience
	}
	if !validGates[s.WhoCanMention] {
		s.WhoCanMention = fill.WhoCanMention
	}
	if !validGates[s.WhoCanMessage] {
		s.WhoCanMessage = fill.WhoCanMessage
	}
	if !validGates[s.WhoCanAddToGroups] {
		s.WhoCanAddToGroups = fill.WhoCanAddToGroups
	}
	if !validGates[s.WhoCanComment] {
		s.WhoCanComment = fill.WhoCanComment
	}
	return s
}

// SettingsForMany batches SettingsFor across users, filling defaults for the
// ones with no row. Used by the feed so 50 posts cost one settings query.
func SettingsForMany(db *gorm.DB, userIDs []string) map[string]models.PrivacySettings {
	out := map[string]models.PrivacySettings{}
	if len(userIDs) == 0 {
		return out
	}
	unique := make([]string, 0, len(userIDs))
	seen := map[string]bool{}
	for _, id := range userIDs {
		if id != "" && !seen[id] {
			seen[id] = true
			unique = append(unique, id)
			out[id] = DefaultSettings(id)
		}
	}
	var rows []models.PrivacySettings
	db.Where("user_id IN ?", unique).Find(&rows)
	for i := range rows {
		out[rows[i].UserID] = rows[i]
	}
	return out
}

// ViewContext carries the extra facts CanView needs that are not user-to-user
// relations.
type ViewContext struct {
	// InGroup answers group-audience content: is the viewer a member of the
	// group this content belongs to?
	InGroup bool
	// InCustomAudience answers AudienceCustom: is the viewer on the explicit
	// allow-list for this item?
	InCustomAudience bool
	// ViewerIsModerator lets staff review reported content regardless of
	// audience. Every such view should be written to the moderation audit log
	// by the caller.
	ViewerIsModerator bool
}

// CanView reports whether the viewer described by rel may read a piece of
// content owned by rel.SubjectID with the given audience.
//
// The order of the checks is the security contract:
//  1. a block denies, before anything else
//  2. the owner always sees their own content
//  3. a moderator may view for review
//  4. otherwise the audience decides
func CanView(rel socialgraph.Relation, audience string, ctx ViewContext) bool {
	// 1. Blocks win over every other rule, including "everyone". A blocked
	//    user seeing public content would defeat the entire point of blocking.
	if rel.EitherBlocked() {
		return false
	}
	// 2. Authors always see their own work, whatever the audience.
	if rel.IsSelf {
		return true
	}
	// 3. Moderator review access. Deliberately after the block check so a
	//    moderator who has personally blocked someone still cannot see them
	//    without unblocking — that keeps the audit trail honest.
	if ctx.ViewerIsModerator {
		return true
	}

	switch audience {
	case AudienceEveryone:
		return true
	case AudienceConnections:
		return rel.Connected
	case AudienceCloseFriends:
		// Note the direction: the OWNER must have listed the VIEWER.
		return rel.IsCloseFriendOfSubject
	case AudienceOnlyMe:
		return false
	case AudienceGroup:
		return ctx.InGroup
	case AudienceCustom:
		return ctx.InCustomAudience
	default:
		// An unrecognised audience denies. Failing closed is the only safe
		// behaviour for a value that reaches us from storage.
		return false
	}
}

// CanViewProfile applies the subject's ProfileVisibility setting.
func CanViewProfile(rel socialgraph.Relation, s models.PrivacySettings, ctx ViewContext) bool {
	return CanView(rel, s.ProfileVisibility, ctx)
}

// gateAllows evaluates one interaction gate against a relation.
func gateAllows(rel socialgraph.Relation, gate string) bool {
	switch gate {
	case GateEveryone:
		return true
	case GateConnections:
		return rel.Connected
	case GateNoOne:
		return false
	default:
		return false // fail closed
	}
}

// Can reports whether the viewer may perform action against the subject.
//
// Self-actions are always permitted (you can always message yourself a note,
// mention yourself, comment on your own post). Blocks always deny.
func Can(rel socialgraph.Relation, s models.PrivacySettings, action Action) bool {
	if rel.EitherBlocked() {
		return false
	}
	if rel.IsSelf {
		return true
	}
	switch action {
	case ActionMention:
		return gateAllows(rel, s.WhoCanMention)
	case ActionMessage:
		return gateAllows(rel, s.WhoCanMessage)
	case ActionAddToGroup:
		return gateAllows(rel, s.WhoCanAddToGroups)
	case ActionComment:
		return gateAllows(rel, s.WhoCanComment)
	case ActionViewProfile:
		return CanView(rel, s.ProfileVisibility, ViewContext{})
	default:
		return false // unknown action fails closed
	}
}

// CanShowPresence reports whether the viewer may see the subject's online
// status. Separate from Can because presence leaks continuously rather than
// on an explicit action, and a blocked user must never see it.
func CanShowPresence(rel socialgraph.Relation, s models.PrivacySettings) bool {
	if rel.EitherBlocked() {
		return false
	}
	if rel.IsSelf {
		return true
	}
	return s.ShowOnlineStatus
}

// IsDiscoverable reports whether the subject may appear in the viewer's search
// results and suggestions.
func IsDiscoverable(rel socialgraph.Relation, s models.PrivacySettings) bool {
	if rel.EitherBlocked() {
		return false
	}
	if rel.IsSelf {
		return true
	}
	if !s.DiscoverableInSearch {
		return false
	}
	// A profile visible only to connections still appears in search for a
	// connection; for anyone else it would be a dead link, so it is hidden.
	return CanView(rel, s.ProfileVisibility, ViewContext{})
}

// FilterMentionable takes the handles a user typed and returns only those they
// are actually permitted to mention, plus the ids that were filtered out.
//
// This is what stops mention-based harassment: someone who has set
// WhoCanMention to "connections" cannot be dragged into a stranger's thread,
// and a blocked user cannot mention their blocker at all.
func FilterMentionable(db *gorm.DB, actorID string, candidateIDs []string) (allowed []string, denied []string) {
	allowed, denied = []string{}, []string{}
	if actorID == "" || len(candidateIDs) == 0 {
		return allowed, denied
	}
	rels := socialgraph.ResolveMany(db, actorID, candidateIDs)
	settings := SettingsForMany(db, candidateIDs)
	for _, id := range candidateIDs {
		if id == "" {
			continue
		}
		if Can(rels[id], settings[id], ActionMention) {
			allowed = append(allowed, id)
		} else {
			denied = append(denied, id)
		}
	}
	return allowed, denied
}

// VisibleAudiencesFor returns the audiences a user may legitimately choose
// when composing. Offering "close friends" to someone with an empty list would
// silently publish to nobody, so it is only offered once the list exists.
func VisibleAudiencesFor(db *gorm.DB, userID string) []string {
	out := []string{AudienceEveryone, AudienceConnections}
	var closeFriends int64
	db.Model(&models.CloseFriend{}).Where("owner_id = ?", userID).Count(&closeFriends)
	if closeFriends > 0 {
		out = append(out, AudienceCloseFriends)
	}
	return append(out, AudienceOnlyMe)
}
