// Package socialgraph owns every relationship between two users and the
// visibility decisions that follow from them.
//
// Why this is one package: before it, "can A see B's content" was decided
// ad hoc in each handler — the feed showed every post to everyone, and there
// was no notion of a block at all. Scattering that logic guarantees the
// checks drift apart, and a drifted privacy check is a data leak. Every
// visibility question in the product now routes through Relation() or the
// helpers built on it.
//
// Relationship kinds and how they differ:
//
//	Connection  mutual, requires accept   — the strong tie (existing model)
//	Follow      one-way, no approval      — the discovery tie
//	CloseFriend one-way, private list     — a story audience
//	Mute        one-way, invisible to the muted party
//	Block       symmetric severance, hard-enforced on every read and write
package socialgraph

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"nile-connect/lib/models"
)

var (
	ErrSelf    = errors.New("you cannot do that to yourself")
	ErrBlocked = errors.New("that action is not available")
)

// Relation is the complete relationship between a viewer and a subject,
// resolved in one round trip. Handlers should fetch this once per request and
// pass it down rather than re-querying per item.
type Relation struct {
	ViewerID  string
	SubjectID string

	IsSelf bool

	// Connected is a mutually accepted Connection.
	Connected bool
	// ConnectionPending is a Connection awaiting a decision, in either
	// direction.
	ConnectionPending bool

	// Following: viewer -> subject. FollowedBy: subject -> viewer.
	Following  bool
	FollowedBy bool

	// IsCloseFriendOfSubject means the SUBJECT has put the VIEWER on their
	// close-friends list — which is what grants the viewer access to the
	// subject's close-friends stories. Note the direction carefully.
	IsCloseFriendOfSubject bool
	// SubjectIsCloseFriend means the viewer has listed the subject.
	SubjectIsCloseFriend bool

	// Muted: the viewer muted the subject. MutedScope is "all"|"posts"|"stories".
	Muted      bool
	MutedScope string

	// Blocking: viewer blocked subject. BlockedBy: subject blocked viewer.
	Blocking  bool
	BlockedBy bool
}

// EitherBlocked reports whether a block exists in either direction. Almost
// every gate wants this rather than a single direction: a blocked user must
// not see the blocker's content, and the blocker must not see theirs.
func (r Relation) EitherBlocked() bool { return r.Blocking || r.BlockedBy }

// Mutual reports a two-way follow, used as a "friend"-strength signal in feed
// ranking and in who-can-message defaults.
func (r Relation) Mutual() bool { return r.Following && r.FollowedBy }

// Strength scores tie strength from 0 to 1 for feed ranking. Deliberately
// simple and explainable: the spec forbids an opaque, manipulative model, and
// a student should be able to understand why they see what they see.
func (r Relation) Strength() float64 {
	switch {
	case r.IsSelf:
		return 1.0
	case r.EitherBlocked():
		return 0
	case r.Connected && r.Mutual():
		return 0.95
	case r.Connected:
		return 0.85
	case r.Mutual():
		return 0.7
	case r.Following:
		return 0.5
	case r.FollowedBy:
		return 0.2
	default:
		return 0.05
	}
}

// Resolve loads the full relation between viewer and subject.
//
// Six small indexed lookups rather than one join: they are all primary-index
// hits, and keeping them separate means Resolve works identically whether the
// two users share a shard. Callers that need many subjects at once should use
// ResolveMany, which batches.
func Resolve(db *gorm.DB, viewerID, subjectID string) Relation {
	rel := Relation{ViewerID: viewerID, SubjectID: subjectID}
	if viewerID == "" || subjectID == "" {
		return rel
	}
	if viewerID == subjectID {
		rel.IsSelf = true
		return rel
	}

	var blocks []models.Block
	db.Where("(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)",
		viewerID, subjectID, subjectID, viewerID).Find(&blocks)
	for i := range blocks {
		if blocks[i].BlockerID == viewerID {
			rel.Blocking = true
		} else {
			rel.BlockedBy = true
		}
	}
	// A block short-circuits everything else: no other relationship is
	// meaningful once one exists, and not loading them avoids leaking
	// follow state through timing or through a careless caller.
	if rel.EitherBlocked() {
		return rel
	}

	var conns []models.Connection
	db.Where("deleted_at IS NULL AND ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))",
		viewerID, subjectID, subjectID, viewerID).Find(&conns)
	for i := range conns {
		switch conns[i].Status {
		case "accepted":
			rel.Connected = true
		case "pending":
			rel.ConnectionPending = true
		}
	}

	var follows []models.Follow
	db.Where("(follower_id = ? AND followee_id = ?) OR (follower_id = ? AND followee_id = ?)",
		viewerID, subjectID, subjectID, viewerID).Find(&follows)
	for i := range follows {
		if follows[i].FollowerID == viewerID {
			rel.Following = true
		} else {
			rel.FollowedBy = true
		}
	}

	var closeFriends []models.CloseFriend
	db.Where("(owner_id = ? AND friend_id = ?) OR (owner_id = ? AND friend_id = ?)",
		viewerID, subjectID, subjectID, viewerID).Find(&closeFriends)
	for i := range closeFriends {
		if closeFriends[i].OwnerID == viewerID {
			rel.SubjectIsCloseFriend = true
		} else {
			rel.IsCloseFriendOfSubject = true
		}
	}

	var mute models.Mute
	if err := db.Where("muter_id = ? AND muted_id = ? AND (expires_at IS NULL OR expires_at > ?)",
		viewerID, subjectID, time.Now()).First(&mute).Error; err == nil {
		rel.Muted = true
		rel.MutedScope = mute.Scope
		if rel.MutedScope == "" {
			rel.MutedScope = "all"
		}
	}

	return rel
}

// ResolveMany batches Resolve across many subjects.
//
// This is the function that keeps the feed off an N+1 path: rendering 50 posts
// by 40 authors performs 5 queries in total, not 240.
func ResolveMany(db *gorm.DB, viewerID string, subjectIDs []string) map[string]Relation {
	out := map[string]Relation{}
	if viewerID == "" || len(subjectIDs) == 0 {
		return out
	}

	unique := make([]string, 0, len(subjectIDs))
	seen := map[string]bool{}
	for _, id := range subjectIDs {
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		unique = append(unique, id)
		out[id] = Relation{ViewerID: viewerID, SubjectID: id, IsSelf: id == viewerID}
	}
	if len(unique) == 0 {
		return out
	}

	apply := func(id string, fn func(*Relation)) {
		if rel, ok := out[id]; ok {
			fn(&rel)
			out[id] = rel
		}
	}

	var blocks []models.Block
	db.Where("(blocker_id = ? AND blocked_id IN ?) OR (blocked_id = ? AND blocker_id IN ?)",
		viewerID, unique, viewerID, unique).Find(&blocks)
	for i := range blocks {
		b := blocks[i]
		if b.BlockerID == viewerID {
			apply(b.BlockedID, func(r *Relation) { r.Blocking = true })
		} else {
			apply(b.BlockerID, func(r *Relation) { r.BlockedBy = true })
		}
	}

	var conns []models.Connection
	db.Where("deleted_at IS NULL AND ((requester_id = ? AND recipient_id IN ?) OR (recipient_id = ? AND requester_id IN ?))",
		viewerID, unique, viewerID, unique).Find(&conns)
	for i := range conns {
		c := conns[i]
		other := c.RecipientID
		if other == viewerID {
			other = c.RequesterID
		}
		apply(other, func(r *Relation) {
			switch c.Status {
			case "accepted":
				r.Connected = true
			case "pending":
				r.ConnectionPending = true
			}
		})
	}

	var follows []models.Follow
	db.Where("(follower_id = ? AND followee_id IN ?) OR (followee_id = ? AND follower_id IN ?)",
		viewerID, unique, viewerID, unique).Find(&follows)
	for i := range follows {
		f := follows[i]
		if f.FollowerID == viewerID {
			apply(f.FolloweeID, func(r *Relation) { r.Following = true })
		} else {
			apply(f.FollowerID, func(r *Relation) { r.FollowedBy = true })
		}
	}

	var closeFriends []models.CloseFriend
	db.Where("(owner_id = ? AND friend_id IN ?) OR (friend_id = ? AND owner_id IN ?)",
		viewerID, unique, viewerID, unique).Find(&closeFriends)
	for i := range closeFriends {
		cf := closeFriends[i]
		if cf.OwnerID == viewerID {
			apply(cf.FriendID, func(r *Relation) { r.SubjectIsCloseFriend = true })
		} else {
			apply(cf.OwnerID, func(r *Relation) { r.IsCloseFriendOfSubject = true })
		}
	}

	var mutes []models.Mute
	db.Where("muter_id = ? AND muted_id IN ? AND (expires_at IS NULL OR expires_at > ?)",
		viewerID, unique, time.Now()).Find(&mutes)
	for i := range mutes {
		m := mutes[i]
		apply(m.MutedID, func(r *Relation) {
			r.Muted = true
			r.MutedScope = m.Scope
			if r.MutedScope == "" {
				r.MutedScope = "all"
			}
		})
	}

	return out
}

// ── Block sets, for query-level filtering ─────────────────────────────────────

// BlockedIDs returns every user id in a block relationship with userID, in
// either direction.
//
// This exists so the feed can exclude blocked authors inside the SQL query
// (WHERE author_id NOT IN ?) rather than fetching their posts and discarding
// them in Go. Filtering after the fact silently shrinks the page and breaks
// pagination — an over-fetch-then-drop feed can return an empty page while
// more results exist.
func BlockedIDs(db *gorm.DB, userID string) []string {
	if userID == "" {
		return nil
	}
	var blocks []models.Block
	db.Where("blocker_id = ? OR blocked_id = ?", userID, userID).Find(&blocks)
	set := map[string]bool{}
	out := make([]string, 0, len(blocks))
	for i := range blocks {
		other := blocks[i].BlockedID
		if other == userID {
			other = blocks[i].BlockerID
		}
		if other != "" && !set[other] {
			set[other] = true
			out = append(out, other)
		}
	}
	return out
}

// MutedIDs returns the users this viewer has muted for the given scope
// ("posts" or "stories"). A scope-"all" mute matches every scope.
func MutedIDs(db *gorm.DB, userID, scope string) []string {
	if userID == "" {
		return nil
	}
	var mutes []models.Mute
	db.Where("muter_id = ? AND (expires_at IS NULL OR expires_at > ?) AND (scope = ? OR scope = ? OR scope = '')",
		userID, time.Now(), "all", scope).Find(&mutes)
	out := make([]string, 0, len(mutes))
	for i := range mutes {
		out = append(out, mutes[i].MutedID)
	}
	return out
}

// FollowingIDs returns everyone userID follows. Used to build the "following"
// feed and to seed ranking.
func FollowingIDs(db *gorm.DB, userID string) []string {
	if userID == "" {
		return nil
	}
	var ids []string
	db.Model(&models.Follow{}).Where("follower_id = ?", userID).Pluck("followee_id", &ids)
	return ids
}

// ConnectionIDs returns every accepted connection of userID.
func ConnectionIDs(db *gorm.DB, userID string) []string {
	if userID == "" {
		return nil
	}
	var conns []models.Connection
	db.Where("deleted_at IS NULL AND status = 'accepted' AND (requester_id = ? OR recipient_id = ?)",
		userID, userID).Find(&conns)
	out := make([]string, 0, len(conns))
	for i := range conns {
		other := conns[i].RecipientID
		if other == userID {
			other = conns[i].RequesterID
		}
		out = append(out, other)
	}
	return out
}

// AudienceIDs returns everyone whose content should appear in userID's home
// feed: the people they follow plus their accepted connections, plus
// themselves. Deduplicated.
func AudienceIDs(db *gorm.DB, userID string) []string {
	if userID == "" {
		return nil
	}
	seen := map[string]bool{userID: true}
	out := []string{userID}
	for _, group := range [][]string{FollowingIDs(db, userID), ConnectionIDs(db, userID)} {
		for _, id := range group {
			if id != "" && !seen[id] {
				seen[id] = true
				out = append(out, id)
			}
		}
	}
	return out
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// Follow creates a follow edge. Idempotent, and refused when either party has
// blocked the other.
func FollowUser(db *gorm.DB, followerID, followeeID string) error {
	if followerID == followeeID {
		return ErrSelf
	}
	if followerID == "" || followeeID == "" {
		return ErrSelf
	}
	// The block check is the security boundary. Without it, a blocked user
	// could re-establish a content channel by following.
	if isBlockedEither(db, followerID, followeeID) {
		return ErrBlocked
	}
	res := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "follower_id"}, {Name: "followee_id"}},
		DoNothing: true,
	}).Create(&models.Follow{FollowerID: followerID, FolloweeID: followeeID})
	return res.Error
}

// UnfollowUser removes the edge. Hard delete: the row sits under a unique
// index, so a tombstone would block re-following forever.
func UnfollowUser(db *gorm.DB, followerID, followeeID string) error {
	return db.Unscoped().
		Where("follower_id = ? AND followee_id = ?", followerID, followeeID).
		Delete(&models.Follow{}).Error
}

// BlockUser blocks subjectID for blockerID and tears down every existing
// relationship between them in one transaction.
//
// The teardown is the important part: a block that leaves the follow edges in
// place means the blocked user keeps receiving the blocker's content in their
// following feed. Blocking must actually sever.
func BlockUser(db *gorm.DB, blockerID, blockedID, reason string) error {
	if blockerID == blockedID || blockerID == "" || blockedID == "" {
		return ErrSelf
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "blocker_id"}, {Name: "blocked_id"}},
			DoNothing: true,
		}).Create(&models.Block{BlockerID: blockerID, BlockedID: blockedID, Reason: reason}).Error; err != nil {
			return err
		}

		// Follows, both directions.
		if err := tx.Unscoped().Where(
			"(follower_id = ? AND followee_id = ?) OR (follower_id = ? AND followee_id = ?)",
			blockerID, blockedID, blockedID, blockerID).Delete(&models.Follow{}).Error; err != nil {
			return err
		}
		// Close-friend membership, both directions.
		if err := tx.Unscoped().Where(
			"(owner_id = ? AND friend_id = ?) OR (owner_id = ? AND friend_id = ?)",
			blockerID, blockedID, blockedID, blockerID).Delete(&models.CloseFriend{}).Error; err != nil {
			return err
		}
		// Any connection, in any state.
		if err := tx.Where(
			"(requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)",
			blockerID, blockedID, blockedID, blockerID).Delete(&models.Connection{}).Error; err != nil {
			return err
		}
		// Reactions the blocked user left on the blocker's content stay (they
		// are aggregate counts), but pending notifications between the two are
		// dropped so neither keeps surfacing in the other's tray.
		return tx.Where("(user_id = ? AND actor_id = ?) OR (user_id = ? AND actor_id = ?)",
			blockerID, blockedID, blockedID, blockerID).Delete(&models.Notification{}).Error
	})
}

// UnblockUser removes the block. Relationships are NOT restored — that is
// deliberate, matching every mature platform: unblocking gives back the
// ability to follow, not the follow itself.
func UnblockUser(db *gorm.DB, blockerID, blockedID string) error {
	return db.Unscoped().
		Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).
		Delete(&models.Block{}).Error
}

// MuteUser hides a user's content from the muter. scope is "all", "posts" or
// "stories"; duration of zero means indefinite.
func MuteUser(db *gorm.DB, muterID, mutedID, scope string, duration time.Duration) error {
	if muterID == mutedID || muterID == "" || mutedID == "" {
		return ErrSelf
	}
	if scope != "posts" && scope != "stories" {
		scope = "all"
	}
	var expires *time.Time
	if duration > 0 {
		t := time.Now().Add(duration)
		expires = &t
	}
	// Re-muting replaces the previous scope/expiry rather than stacking rows.
	return db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "muter_id"}, {Name: "muted_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"scope", "expires_at"}),
	}).Create(&models.Mute{
		MuterID: muterID, MutedID: mutedID, Scope: scope, ExpiresAt: expires,
	}).Error
}

// UnmuteUser lifts a mute.
func UnmuteUser(db *gorm.DB, muterID, mutedID string) error {
	return db.Unscoped().
		Where("muter_id = ? AND muted_id = ?", muterID, mutedID).
		Delete(&models.Mute{}).Error
}

// AddCloseFriend adds subjectID to ownerID's private close-friends list.
func AddCloseFriend(db *gorm.DB, ownerID, friendID string) error {
	if ownerID == friendID || ownerID == "" || friendID == "" {
		return ErrSelf
	}
	if isBlockedEither(db, ownerID, friendID) {
		return ErrBlocked
	}
	return db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "owner_id"}, {Name: "friend_id"}},
		DoNothing: true,
	}).Create(&models.CloseFriend{OwnerID: ownerID, FriendID: friendID}).Error
}

// RemoveCloseFriend removes someone from the list.
func RemoveCloseFriend(db *gorm.DB, ownerID, friendID string) error {
	return db.Unscoped().
		Where("owner_id = ? AND friend_id = ?", ownerID, friendID).
		Delete(&models.CloseFriend{}).Error
}

// isBlockedEither is the internal fast path used by the mutation guards.
func isBlockedEither(db *gorm.DB, a, b string) bool {
	var count int64
	db.Model(&models.Block{}).Where(
		"(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)",
		a, b, b, a).Count(&count)
	return count > 0
}

// IsBlockedEither is the exported form, for handlers that need the check
// without a full Resolve.
func IsBlockedEither(db *gorm.DB, a, b string) bool {
	if a == "" || b == "" || a == b {
		return false
	}
	return isBlockedEither(db, a, b)
}

// ── Counters ──────────────────────────────────────────────────────────────────

// Counts is the follower/following/connection summary shown on a profile.
type Counts struct {
	Followers   int64 `json:"followers"`
	Following   int64 `json:"following"`
	Connections int64 `json:"connections"`
}

// CountsFor loads a user's profile counters in three indexed COUNT queries.
func CountsFor(db *gorm.DB, userID string) Counts {
	var c Counts
	db.Model(&models.Follow{}).Where("followee_id = ?", userID).Count(&c.Followers)
	db.Model(&models.Follow{}).Where("follower_id = ?", userID).Count(&c.Following)
	db.Model(&models.Connection{}).
		Where("deleted_at IS NULL AND status = 'accepted' AND (requester_id = ? OR recipient_id = ?)", userID, userID).
		Count(&c.Connections)
	return c
}

// MutualConnectionIDs returns users connected to BOTH viewer and subject,
// capped at limit. This powers "3 mutual connections" on a profile, which is
// the single strongest trust signal in a student network.
func MutualConnectionIDs(db *gorm.DB, viewerID, subjectID string, limit int) []string {
	if viewerID == "" || subjectID == "" || viewerID == subjectID {
		return nil
	}
	mine := ConnectionIDs(db, viewerID)
	if len(mine) == 0 {
		return nil
	}
	theirs := map[string]bool{}
	for _, id := range ConnectionIDs(db, subjectID) {
		theirs[id] = true
	}
	out := make([]string, 0, limit)
	for _, id := range mine {
		if theirs[id] {
			out = append(out, id)
			if limit > 0 && len(out) >= limit {
				break
			}
		}
	}
	return out
}
