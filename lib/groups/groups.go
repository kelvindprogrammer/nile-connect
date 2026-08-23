// Package groups owns Groups and the Communities that contain them.
//
// The model, in one paragraph: a Community is a container (a student
// organisation, a department, a club) that holds many Groups. A Group is where
// posting actually happens. A Group may also stand alone with no Community —
// that is a study group between friends, and forcing it into a container
// would make the common case the awkward one.
//
// Membership rules that matter and are enforced here, not in the UI:
//
//   - Roles are hierarchical: owner > admin > moderator > member. A member can
//     never act on someone at or above their own rank.
//   - Exactly one owner exists at all times. The owner cannot leave without
//     transferring ownership, because a group with no owner is unadministrable
//     and the spec calls out "last admin leaving" as a case that must be handled.
//   - Visibility and join policy are separate axes. A group can be findable but
//     closed (request to join), or invisible but open to anyone holding a link.
package groups

import (
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"nile-connect/lib/models"
	"nile-connect/lib/privacy"
	"nile-connect/lib/socialgraph"
)

// Roles, ordered.
const (
	RoleOwner     = "owner"
	RoleAdmin     = "admin"
	RoleModerator = "moderator"
	RoleMember    = "member"
)

var roleRank = map[string]int{
	RoleOwner: 4, RoleAdmin: 3, RoleModerator: 2, RoleMember: 1,
}

// Membership statuses.
const (
	StatusActive  = "active"
	StatusPending = "pending"
	StatusBanned  = "banned"
	StatusLeft    = "left"
)

// Visibility.
const (
	VisibilityPublic     = "public"     // findable, listed
	VisibilityRestricted = "restricted" // findable, join needs approval
	VisibilityPrivate    = "private"    // hidden from search, invite only
)

// Join policy.
const (
	JoinOpen       = "open"
	JoinRequest    = "request"
	JoinInviteOnly = "invite_only"
)

// Group kinds shape who may post.
const (
	KindDiscussion   = "discussion"   // every active member posts
	KindAnnouncement = "announcement" // only admins post
	KindQA           = "qa"
	KindResource     = "resource"
)

var (
	ErrNotFound      = errors.New("that group is no longer available")
	ErrForbidden     = errors.New("you do not have permission to do that")
	ErrAlreadyMember = errors.New("you are already a member")
	ErrBanned        = errors.New("you cannot rejoin this group")
	ErrLastOwner     = errors.New("transfer ownership before you leave")
	ErrInviteInvalid = errors.New("that invite link is not valid any more")
	ErrNameRequired  = errors.New("give your group a name")
)

var validVisibility = map[string]bool{
	VisibilityPublic: true, VisibilityRestricted: true, VisibilityPrivate: true,
}
var validJoinPolicy = map[string]bool{
	JoinOpen: true, JoinRequest: true, JoinInviteOnly: true,
}
var validKinds = map[string]bool{
	KindDiscussion: true, KindAnnouncement: true, KindQA: true, KindResource: true,
}
var validRoles = map[string]bool{
	RoleOwner: true, RoleAdmin: true, RoleModerator: true, RoleMember: true,
}

// ── Slugs ─────────────────────────────────────────────────────────────────────

// Slugify converts a display name into a URL-safe slug.
func Slugify(name string) string {
	var b strings.Builder
	lastDash := true
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		switch {
		case unicode.IsLetter(r) && r < unicode.MaxASCII, unicode.IsDigit(r):
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	slug := strings.Trim(b.String(), "-")
	if len(slug) > 48 {
		slug = strings.Trim(slug[:48], "-")
	}
	return slug
}

// uniqueSlug appends a short suffix until the slug is free. Slugs are a unique
// index, so a collision would otherwise fail the insert and lose the user's work.
func uniqueSlug(db *gorm.DB, table, base string) string {
	if base == "" {
		base = "group"
	}
	slug := base
	for attempt := 0; attempt < 12; attempt++ {
		var n int64
		db.Table(table).Where("slug = ?", slug).Count(&n)
		if n == 0 {
			return slug
		}
		slug = fmt.Sprintf("%s-%s", base, randomToken(3))
	}
	return fmt.Sprintf("%s-%s", base, randomToken(8))
}

// randomToken returns a lowercase base32 token of roughly n bytes of entropy.
func randomToken(n int) string {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		// Falling back to a timestamp keeps creation working; uniqueness is
		// still guaranteed by the retry loop above.
		return fmt.Sprintf("%d", time.Now().UnixNano()%100000)
	}
	return strings.ToLower(strings.TrimRight(
		base32.StdEncoding.EncodeToString(buf), "="))
}

// ── Communities ───────────────────────────────────────────────────────────────

type CreateCommunityInput struct {
	CreatorID   string
	Name        string
	Description string
	Category    string
	Visibility  string
	AvatarURL   string
	CoverURL    string
}

// CreateCommunity creates a community and enrols its creator as owner.
func CreateCommunity(db *gorm.DB, in CreateCommunityInput) (models.Community, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return models.Community{}, ErrNameRequired
	}
	visibility := in.Visibility
	if !validVisibility[visibility] {
		visibility = VisibilityPublic
	}

	community := models.Community{
		Name:        in.Name,
		Slug:        uniqueSlug(db, "communities", Slugify(in.Name)),
		Description: in.Description,
		Category:    in.Category,
		Visibility:  visibility,
		AvatarURL:   in.AvatarURL,
		CoverURL:    in.CoverURL,
		CreatedBy:   in.CreatorID,
		Status:      "active",
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&community).Error; err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Create(&models.CommunityMember{
			CommunityID: community.ID, UserID: in.CreatorID,
			Role: RoleOwner, Status: StatusActive, JoinedAt: &now,
		}).Error; err != nil {
			return err
		}
		return recountCommunity(tx, community.ID)
	})
	if err != nil {
		return models.Community{}, err
	}
	community.MembersCount = 1
	return community, nil
}

func recountCommunity(tx *gorm.DB, communityID string) error {
	return tx.Exec(`UPDATE communities SET
			members_count = (SELECT COUNT(*) FROM community_members
			                 WHERE community_id = ? AND status = 'active'),
			groups_count  = (SELECT COUNT(*) FROM groups
			                 WHERE community_id = ? AND deleted_at IS NULL)
		WHERE id = ?`, communityID, communityID, communityID).Error
}

// ── Groups ────────────────────────────────────────────────────────────────────

type CreateGroupInput struct {
	CreatorID   string
	CommunityID *string
	Name        string
	Description string
	Kind        string
	Visibility  string
	JoinPolicy  string
	AvatarURL   string
	CoverURL    string
}

// CreateGroup creates a group and enrols its creator as owner.
func CreateGroup(db *gorm.DB, in CreateGroupInput) (models.Group, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return models.Group{}, ErrNameRequired
	}

	visibility := in.Visibility
	if !validVisibility[visibility] {
		visibility = VisibilityPublic
	}
	joinPolicy := in.JoinPolicy
	if !validJoinPolicy[joinPolicy] {
		joinPolicy = JoinOpen
	}
	kind := in.Kind
	if !validKinds[kind] {
		kind = KindDiscussion
	}
	// A private group that anyone can join is a contradiction; the stricter
	// half wins so visibility can never be widened by a policy mismatch.
	if visibility == VisibilityPrivate && joinPolicy == JoinOpen {
		joinPolicy = JoinInviteOnly
	}

	// Creating a group inside a community requires being able to administer it.
	if in.CommunityID != nil && *in.CommunityID != "" {
		if !CanAdministerCommunity(db, *in.CommunityID, in.CreatorID) {
			return models.Group{}, ErrForbidden
		}
	}

	group := models.Group{
		CommunityID: in.CommunityID,
		Name:        in.Name,
		Slug:        uniqueSlug(db, "groups", Slugify(in.Name)),
		Description: in.Description,
		Kind:        kind,
		Visibility:  visibility,
		JoinPolicy:  joinPolicy,
		AvatarURL:   in.AvatarURL,
		CoverURL:    in.CoverURL,
		CreatedBy:   in.CreatorID,
		Status:      "active",
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&group).Error; err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Create(&models.GroupMember{
			GroupID: group.ID, UserID: in.CreatorID,
			Role: RoleOwner, Status: StatusActive, JoinedAt: &now,
			NotificationLevel: "all",
		}).Error; err != nil {
			return err
		}
		if err := recountGroup(tx, group.ID); err != nil {
			return err
		}
		if in.CommunityID != nil && *in.CommunityID != "" {
			return recountCommunity(tx, *in.CommunityID)
		}
		return nil
	})
	if err != nil {
		return models.Group{}, err
	}
	group.MembersCount = 1
	return group, nil
}

func recountGroup(tx *gorm.DB, groupID string) error {
	return tx.Exec(`UPDATE groups SET
			members_count = (SELECT COUNT(*) FROM group_members
			                 WHERE group_id = ? AND status = 'active'),
			posts_count   = (SELECT COUNT(*) FROM posts
			                 WHERE group_id = ? AND deleted_at IS NULL
			                   AND moderation_status = 'active')
		WHERE id = ?`, groupID, groupID, groupID).Error
}

// ── Membership queries ────────────────────────────────────────────────────────

// Membership is a user's standing in a group.
type Membership struct {
	Found  bool
	Role   string
	Status string
	// MutedUntil silences group notifications without leaving.
	MutedUntil        *time.Time
	NotificationLevel string
}

// IsActive reports full membership.
func (m Membership) IsActive() bool { return m.Found && m.Status == StatusActive }

// Rank returns the numeric role rank, 0 when not an active member.
func (m Membership) Rank() int {
	if !m.IsActive() {
		return 0
	}
	return roleRank[m.Role]
}

// CanPost applies the group kind's posting rule.
func (m Membership) CanPost(group *models.Group) bool {
	if !m.IsActive() {
		return false
	}
	if m.MutedUntil != nil && m.MutedUntil.After(time.Now()) {
		return false
	}
	if group.Kind == KindAnnouncement {
		return m.Rank() >= roleRank[RoleAdmin]
	}
	return true
}

// CanModerate covers removing posts and members.
func (m Membership) CanModerate() bool { return m.Rank() >= roleRank[RoleModerator] }

// CanAdminister covers settings, invites and role changes.
func (m Membership) CanAdminister() bool { return m.Rank() >= roleRank[RoleAdmin] }

// MembershipFor loads a user's standing.
func MembershipFor(db *gorm.DB, groupID, userID string) Membership {
	if groupID == "" || userID == "" {
		return Membership{}
	}
	var row models.GroupMember
	if err := db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&row).Error; err != nil {
		return Membership{}
	}
	// A ban whose clock has run out is no longer a ban.
	if row.Status == StatusBanned && row.BannedUntil != nil && row.BannedUntil.Before(time.Now()) {
		row.Status = StatusLeft
	}
	return Membership{
		Found: true, Role: row.Role, Status: row.Status,
		MutedUntil: row.MutedUntil, NotificationLevel: row.NotificationLevel,
	}
}

// MembershipsFor batches MembershipFor across groups, so a list of 20 groups
// costs one query rather than 20.
func MembershipsFor(db *gorm.DB, userID string, groupIDs []string) map[string]Membership {
	out := map[string]Membership{}
	if userID == "" || len(groupIDs) == 0 {
		return out
	}
	var rows []models.GroupMember
	db.Where("user_id = ? AND group_id IN ?", userID, groupIDs).Find(&rows)
	for i := range rows {
		row := rows[i]
		status := row.Status
		if status == StatusBanned && row.BannedUntil != nil && row.BannedUntil.Before(time.Now()) {
			status = StatusLeft
		}
		out[row.GroupID] = Membership{
			Found: true, Role: row.Role, Status: status,
			MutedUntil: row.MutedUntil, NotificationLevel: row.NotificationLevel,
		}
	}
	return out
}

// CanAdministerCommunity reports whether a user may administer a community.
func CanAdministerCommunity(db *gorm.DB, communityID, userID string) bool {
	var row models.CommunityMember
	if err := db.Where("community_id = ? AND user_id = ? AND status = ?",
		communityID, userID, StatusActive).First(&row).Error; err != nil {
		return false
	}
	return roleRank[row.Role] >= roleRank[RoleAdmin]
}

// CanSeeGroup decides whether a group is visible to a user.
//
// A private group is invisible to non-members — including from search — which
// is what makes "private" mean anything.
func CanSeeGroup(group *models.Group, m Membership, isStaff bool) bool {
	if group.Status != "active" && !isStaff {
		return false
	}
	if m.IsActive() || isStaff {
		return true
	}
	return group.Visibility != VisibilityPrivate
}

// CanReadPosts decides whether a user may read a group's content. Stricter
// than CanSeeGroup: a restricted group is findable but its posts are not
// readable until you join.
func CanReadPosts(group *models.Group, m Membership, isStaff bool) bool {
	if isStaff {
		return true
	}
	if m.IsActive() {
		return true
	}
	return group.Visibility == VisibilityPublic
}

// ── Joining and leaving ───────────────────────────────────────────────────────

// JoinResult reports what happened, since joining may land as pending.
type JoinResult struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// Join adds a user to a group, honouring its join policy.
func Join(db *gorm.DB, groupID, userID string) (JoinResult, error) {
	var group models.Group
	if err := db.Where("id = ? AND deleted_at IS NULL", groupID).First(&group).Error; err != nil {
		return JoinResult{}, ErrNotFound
	}
	if group.Status != "active" {
		return JoinResult{}, ErrNotFound
	}

	existing := MembershipFor(db, groupID, userID)
	if existing.Status == StatusBanned {
		return JoinResult{}, ErrBanned
	}
	if existing.IsActive() {
		return JoinResult{}, ErrAlreadyMember
	}
	if group.JoinPolicy == JoinInviteOnly {
		return JoinResult{}, ErrForbidden
	}

	status := StatusActive
	message := "You joined " + group.Name
	if group.JoinPolicy == JoinRequest {
		status = StatusPending
		message = "Your request to join " + group.Name + " was sent"
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		member := models.GroupMember{
			GroupID: groupID, UserID: userID,
			Role: RoleMember, Status: status, NotificationLevel: "mentions",
		}
		if status == StatusActive {
			member.JoinedAt = &now
		}
		if err := tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "group_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"status": status, "role": RoleMember, "joined_at": member.JoinedAt,
			}),
		}).Create(&member).Error; err != nil {
			return err
		}
		return recountGroup(tx, groupID)
	})
	if err != nil {
		return JoinResult{}, err
	}
	return JoinResult{Status: status, Message: message}, nil
}

// Leave removes a user from a group.
//
// The owner may not simply leave: a group with no owner cannot be
// administered, and the spec names "last admin leaving" as a case that must be
// handled rather than allowed to corrupt the group.
func Leave(db *gorm.DB, groupID, userID string) error {
	m := MembershipFor(db, groupID, userID)
	if !m.Found {
		return nil // already not a member
	}
	if m.Role == RoleOwner {
		var otherAdmins int64
		db.Model(&models.GroupMember{}).
			Where("group_id = ? AND user_id <> ? AND status = ? AND role IN ?",
				groupID, userID, StatusActive, []string{RoleOwner, RoleAdmin}).
			Count(&otherAdmins)
		if otherAdmins == 0 {
			return ErrLastOwner
		}
		// Hand ownership to the longest-serving remaining admin, so the group
		// is never ownerless even for an instant.
		var successor models.GroupMember
		if err := db.Where("group_id = ? AND user_id <> ? AND status = ? AND role = ?",
			groupID, userID, StatusActive, RoleAdmin).
			Order("joined_at asc").First(&successor).Error; err == nil {
			db.Model(&models.GroupMember{}).Where("id = ?", successor.ID).
				Update("role", RoleOwner)
		}
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.GroupMember{}).
			Where("group_id = ? AND user_id = ?", groupID, userID).
			Updates(map[string]any{"status": StatusLeft, "role": RoleMember}).Error; err != nil {
			return err
		}
		return recountGroup(tx, groupID)
	})
}

// ── Member management ─────────────────────────────────────────────────────────

// SetRole changes a member's role.
//
// The rank guard is the security boundary: a moderator cannot promote
// themselves, and an admin cannot demote the owner.
func SetRole(db *gorm.DB, groupID, actorID, targetID, role string) error {
	if !validRoles[role] {
		return errors.New("unknown role")
	}
	actor := MembershipFor(db, groupID, actorID)
	target := MembershipFor(db, groupID, targetID)

	if !actor.CanAdminister() {
		return ErrForbidden
	}
	if !target.Found {
		return ErrNotFound
	}
	// You may only act on someone strictly below you, and only grant a role
	// strictly below your own. Both halves are needed: without the second, an
	// admin could mint another owner.
	if target.Rank() >= actor.Rank() {
		return ErrForbidden
	}
	if roleRank[role] >= actor.Rank() {
		return ErrForbidden
	}

	return db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, targetID).
		Update("role", role).Error
}

// TransferOwnership hands the owner role to another active member.
func TransferOwnership(db *gorm.DB, groupID, currentOwnerID, newOwnerID string) error {
	owner := MembershipFor(db, groupID, currentOwnerID)
	if owner.Role != RoleOwner || !owner.IsActive() {
		return ErrForbidden
	}
	target := MembershipFor(db, groupID, newOwnerID)
	if !target.IsActive() {
		return ErrNotFound
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.GroupMember{}).
			Where("group_id = ? AND user_id = ?", groupID, newOwnerID).
			Update("role", RoleOwner).Error; err != nil {
			return err
		}
		// The outgoing owner becomes an admin rather than a plain member, so
		// they can still help run the group.
		return tx.Model(&models.GroupMember{}).
			Where("group_id = ? AND user_id = ?", groupID, currentOwnerID).
			Update("role", RoleAdmin).Error
	})
}

// RemoveMember kicks or bans someone.
func RemoveMember(db *gorm.DB, groupID, actorID, targetID, reason string, ban bool, banDuration time.Duration) error {
	actor := MembershipFor(db, groupID, actorID)
	target := MembershipFor(db, groupID, targetID)

	if !actor.CanModerate() {
		return ErrForbidden
	}
	if !target.Found {
		return ErrNotFound
	}
	if target.Rank() >= actor.Rank() {
		return ErrForbidden
	}

	status := StatusLeft
	var until *time.Time
	if ban {
		status = StatusBanned
		if banDuration > 0 {
			t := time.Now().Add(banDuration)
			until = &t
		}
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.GroupMember{}).
			Where("group_id = ? AND user_id = ?", groupID, targetID).
			Updates(map[string]any{
				"status": status, "role": RoleMember,
				"banned_until": until, "ban_reason": reason,
			}).Error; err != nil {
			return err
		}
		return recountGroup(tx, groupID)
	})
}

// ApproveRequest accepts or declines a pending join request.
func ApproveRequest(db *gorm.DB, groupID, actorID, targetID string, approve bool) error {
	actor := MembershipFor(db, groupID, actorID)
	if !actor.CanModerate() {
		return ErrForbidden
	}
	target := MembershipFor(db, groupID, targetID)
	if !target.Found || target.Status != StatusPending {
		return ErrNotFound
	}

	status := StatusLeft
	var joinedAt *time.Time
	if approve {
		status = StatusActive
		now := time.Now()
		joinedAt = &now
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.GroupMember{}).
			Where("group_id = ? AND user_id = ?", groupID, targetID).
			Updates(map[string]any{"status": status, "joined_at": joinedAt}).Error; err != nil {
			return err
		}
		return recountGroup(tx, groupID)
	})
}

// AddMember is the "add someone directly" path, used for invites accepted by
// an admin. It respects the target's WhoCanAddToGroups privacy gate.
func AddMember(db *gorm.DB, groupID, actorID, targetID string) error {
	actor := MembershipFor(db, groupID, actorID)
	if !actor.CanAdminister() {
		return ErrForbidden
	}
	if socialgraph.IsBlockedEither(db, actorID, targetID) {
		return ErrForbidden
	}
	// Being added to a group is something people are entitled to control.
	rel := socialgraph.Resolve(db, actorID, targetID)
	settings := privacy.SettingsFor(db, targetID)
	if !privacy.Can(rel, settings, privacy.ActionAddToGroup) {
		return ErrForbidden
	}

	existing := MembershipFor(db, groupID, targetID)
	if existing.Status == StatusBanned {
		return ErrBanned
	}

	return db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "group_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"status": StatusActive, "joined_at": now, "invited_by": actorID,
			}),
		}).Create(&models.GroupMember{
			GroupID: groupID, UserID: targetID, Role: RoleMember,
			Status: StatusActive, JoinedAt: &now, InvitedBy: actorID,
			NotificationLevel: "mentions",
		}).Error; err != nil {
			return err
		}
		return recountGroup(tx, groupID)
	})
}

// SetNotificationLevel lets a member choose all | mentions | none.
func SetNotificationLevel(db *gorm.DB, groupID, userID, level string) error {
	if level != "all" && level != "mentions" && level != "none" {
		level = "mentions"
	}
	return db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, userID).
		Update("notification_level", level).Error
}

// ── Invites ───────────────────────────────────────────────────────────────────

// CreateInvite mints a shareable join code.
func CreateInvite(db *gorm.DB, groupID, actorID string, maxUses int, ttl time.Duration) (models.GroupInvite, error) {
	actor := MembershipFor(db, groupID, actorID)
	if !actor.CanAdminister() {
		return models.GroupInvite{}, ErrForbidden
	}
	var expires *time.Time
	if ttl > 0 {
		t := time.Now().Add(ttl)
		expires = &t
	}
	if maxUses < 0 {
		maxUses = 0
	}
	invite := models.GroupInvite{
		GroupID: groupID, Code: randomToken(8),
		CreatedBy: actorID, MaxUses: maxUses, ExpiresAt: expires,
	}
	if err := db.Create(&invite).Error; err != nil {
		return models.GroupInvite{}, err
	}
	return invite, nil
}

// RedeemInvite joins a user via a code, bypassing the join policy — which is
// the point of an invite — but never bypassing a ban.
func RedeemInvite(db *gorm.DB, code, userID string) (models.Group, error) {
	var invite models.GroupInvite
	if err := db.Where("code = ? AND deleted_at IS NULL", code).First(&invite).Error; err != nil {
		return models.Group{}, ErrInviteInvalid
	}
	if invite.RevokedAt != nil {
		return models.Group{}, ErrInviteInvalid
	}
	if invite.ExpiresAt != nil && invite.ExpiresAt.Before(time.Now()) {
		return models.Group{}, ErrInviteInvalid
	}
	if invite.MaxUses > 0 && invite.Uses >= invite.MaxUses {
		return models.Group{}, ErrInviteInvalid
	}

	var group models.Group
	if err := db.Where("id = ? AND deleted_at IS NULL", invite.GroupID).First(&group).Error; err != nil {
		return models.Group{}, ErrNotFound
	}

	existing := MembershipFor(db, group.ID, userID)
	if existing.Status == StatusBanned {
		return models.Group{}, ErrBanned
	}
	if existing.IsActive() {
		return group, nil // already in; treat as success
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "group_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"status": StatusActive, "joined_at": now,
			}),
		}).Create(&models.GroupMember{
			GroupID: group.ID, UserID: userID, Role: RoleMember,
			Status: StatusActive, JoinedAt: &now, NotificationLevel: "mentions",
		}).Error; err != nil {
			return err
		}
		// Counting uses atomically stops a link with maxUses=1 being redeemed
		// twice by two simultaneous clicks.
		if err := tx.Model(&models.GroupInvite{}).Where("id = ?", invite.ID).
			UpdateColumn("uses", gorm.Expr("uses + 1")).Error; err != nil {
			return err
		}
		return recountGroup(tx, group.ID)
	})
	if err != nil {
		return models.Group{}, err
	}
	return group, nil
}

// RevokeInvite disables a code.
func RevokeInvite(db *gorm.DB, inviteID, actorID string) error {
	var invite models.GroupInvite
	if err := db.Where("id = ?", inviteID).First(&invite).Error; err != nil {
		return ErrNotFound
	}
	if !MembershipFor(db, invite.GroupID, actorID).CanAdminister() {
		return ErrForbidden
	}
	now := time.Now()
	return db.Model(&models.GroupInvite{}).Where("id = ?", inviteID).
		Update("revoked_at", now).Error
}

// ── Discovery ─────────────────────────────────────────────────────────────────

// Discover lists groups a user may find, newest and busiest first.
func Discover(db *gorm.DB, userID, query string, limit, offset int) ([]models.Group, int64) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	q := db.Model(&models.Group{}).
		Where("deleted_at IS NULL AND status = ?", "active").
		// Private groups are invisible in discovery, by definition.
		Where("visibility <> ?", VisibilityPrivate)

	if query != "" {
		like := "%" + strings.ToLower(query) + "%"
		q = q.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", like, like)
	}

	var total int64
	q.Count(&total)

	var out []models.Group
	q.Order("members_count desc, created_at desc").Limit(limit).Offset(offset).Find(&out)
	return out, total
}

// MyGroups lists a user's active memberships.
func MyGroups(db *gorm.DB, userID string) []models.Group {
	var ids []string
	db.Model(&models.GroupMember{}).
		Where("user_id = ? AND status = ?", userID, StatusActive).
		Pluck("group_id", &ids)
	if len(ids) == 0 {
		return []models.Group{}
	}
	var out []models.Group
	db.Where("id IN ? AND deleted_at IS NULL", ids).
		Order("members_count desc").Find(&out)
	return out
}

// MyGroupIDs is the cheap form used by feed ranking.
func MyGroupIDs(db *gorm.DB, userID string) []string {
	if userID == "" {
		return nil
	}
	var ids []string
	db.Model(&models.GroupMember{}).
		Where("user_id = ? AND status = ?", userID, StatusActive).
		Pluck("group_id", &ids)
	return ids
}

// Members lists a group's roster, highest rank first.
func Members(db *gorm.DB, groupID, status string, limit, offset int) ([]models.GroupMember, int64) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if status == "" {
		status = StatusActive
	}
	q := db.Model(&models.GroupMember{}).Where("group_id = ? AND status = ?", groupID, status)

	var total int64
	q.Count(&total)

	var out []models.GroupMember
	// Ordering by role rank requires a CASE, since the column is text.
	q.Order(`CASE role
	           WHEN 'owner' THEN 4 WHEN 'admin' THEN 3
	           WHEN 'moderator' THEN 2 ELSE 1 END DESC, joined_at asc`).
		Limit(limit).Offset(offset).Find(&out)
	return out, total
}

// UpdateGroup applies settings changes.
func UpdateGroup(db *gorm.DB, groupID, actorID string, updates map[string]any) error {
	if !MembershipFor(db, groupID, actorID).CanAdminister() {
		return ErrForbidden
	}
	allowed := map[string]bool{
		"name": true, "description": true, "avatar_url": true, "cover_url": true,
		"visibility": true, "join_policy": true, "kind": true, "pinned_post_id": true,
	}
	safe := map[string]any{}
	for k, v := range updates {
		if !allowed[k] {
			continue
		}
		// Enum columns are re-validated here; a client must not be able to
		// write an unrecognised visibility that later fails open.
		switch k {
		case "visibility":
			if s, ok := v.(string); ok && validVisibility[s] {
				safe[k] = s
			}
		case "join_policy":
			if s, ok := v.(string); ok && validJoinPolicy[s] {
				safe[k] = s
			}
		case "kind":
			if s, ok := v.(string); ok && validKinds[s] {
				safe[k] = s
			}
		default:
			safe[k] = v
		}
	}
	if len(safe) == 0 {
		return nil
	}
	return db.Model(&models.Group{}).Where("id = ?", groupID).Updates(safe).Error
}

// DeleteGroup soft-deletes a group. Owner or staff only; the caller enforces
// the staff case.
func DeleteGroup(db *gorm.DB, groupID, actorID string, isStaff bool) error {
	m := MembershipFor(db, groupID, actorID)
	if m.Role != RoleOwner && !isStaff {
		return ErrForbidden
	}
	var group models.Group
	db.Where("id = ?", groupID).First(&group)

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", groupID).Delete(&models.Group{}).Error; err != nil {
			return err
		}
		// Posts scoped to the group go with it — otherwise they would become
		// orphans that no membership check can ever authorise.
		if err := tx.Where("group_id = ?", groupID).Delete(&models.Post{}).Error; err != nil {
			return err
		}
		if group.CommunityID != nil && *group.CommunityID != "" {
			return recountCommunity(tx, *group.CommunityID)
		}
		return nil
	})
}
