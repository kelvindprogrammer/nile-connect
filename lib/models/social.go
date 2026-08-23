package models

import (
	"time"

	"gorm.io/gorm"
)

// Social-layer models.
//
// Kept in their own file rather than appended to models.go so the social
// domain stays legible as it grows. Same package, so callers still reference
// them as models.Follow, models.Report, and so on.
//
// Conventions inherited from models.go: string UUID primary keys, soft-delete
// via gorm.DeletedAt, no GORM associations (relationships are plain FK columns
// joined manually in the handlers).
//
// Two deliberate exceptions to soft-delete, both for tables that sit under a
// UNIQUE index: Follow, Block, Mute, CloseFriend, Reaction, Bookmark,
// StoryView and PollVote are hard-deleted. A soft-deleted row still occupies
// the unique index, which would permanently prevent re-following, re-reacting
// or re-voting after an undo. These are edge-list rows with no audit value of
// their own — the audit trail lives in ModerationAction and AnalyticsEvent.

// ── Social graph ──────────────────────────────────────────────────────────────

// Follow is a directed edge: FollowerID follows FolloweeID.
//
// Deliberately separate from Connection (the existing mutual, request/accept
// relationship). Following is asymmetric and needs no approval, which is what
// makes discovery work; Connection stays as the stronger mutual tie. Both feed
// into the visibility engine.
type Follow struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	FollowerID string `gorm:"not null;index"`
	FolloweeID string `gorm:"not null;index"`
}

// Block is a hard severance: BlockedID can no longer see, contact, follow or
// interact with BlockerID, and vice versa. Enforced server-side in the
// visibility engine, never only in the UI.
type Block struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	BlockerID string `gorm:"not null;index"`
	BlockedID string `gorm:"not null;index"`
	// Reason is optional and private to the blocker; never exposed to the
	// blocked user.
	Reason string `gorm:"type:text"`
}

// Mute hides someone's content from the muter's feed and story tray without
// severing the relationship or telling the muted user. ExpiresAt supports
// "mute for 24 hours / 7 days"; nil means indefinite.
type Mute struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	MuterID   string `gorm:"not null;index"`
	MutedID   string `gorm:"not null;index"`
	// Scope: "all" mutes posts and stories, "stories" mutes only stories,
	// "posts" mutes only feed posts.
	Scope     string `gorm:"type:text;default:'all'"`
	ExpiresAt *time.Time
}

// CloseFriend is a one-way list the owner curates, used as a story audience.
// The friend is never told they are on (or off) the list.
type CloseFriend struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	OwnerID   string `gorm:"not null;index"`
	FriendID  string `gorm:"not null;index"`
}

// ── Privacy ───────────────────────────────────────────────────────────────────

// PrivacySettings is one row per user, created lazily on first read with the
// documented defaults. Every field is enforced server-side by lib/privacy.
type PrivacySettings struct {
	UserID    string `gorm:"primaryKey;type:text"`
	CreatedAt time.Time
	UpdatedAt time.Time

	// Audience values: "everyone" | "connections" | "close_friends" | "only_me".
	ProfileVisibility    string `gorm:"type:text;default:'everyone'"`
	DefaultPostAudience  string `gorm:"type:text;default:'everyone'"`
	DefaultStoryAudience string `gorm:"type:text;default:'connections'"`

	// Interaction gates: "everyone" | "connections" | "no_one".
	WhoCanMention     string `gorm:"type:text;default:'everyone'"`
	WhoCanMessage     string `gorm:"type:text;default:'everyone'"`
	WhoCanAddToGroups string `gorm:"type:text;default:'connections'"`
	WhoCanComment     string `gorm:"type:text;default:'everyone'"`

	ShowOnlineStatus     bool `gorm:"default:true"`
	ShowActivityStatus   bool `gorm:"default:true"`
	DiscoverableInSearch bool `gorm:"default:true"`
	// AllowStoryResharing lets others reshare this user's story to their own.
	AllowStoryResharing bool `gorm:"default:true"`
}

// ── Reactions ─────────────────────────────────────────────────────────────────

// Reaction generalises the old PostLike to any subject and any reaction type.
//
// PostLike is retained and kept in sync for backwards compatibility with the
// existing likes_count reads; see lib/reactions. One reaction per
// (user, subject) — changing your reaction updates the row rather than adding
// a second one.
type Reaction struct {
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	SubjectType string `gorm:"type:text;not null;index"` // post | comment | story
	SubjectID   string `gorm:"type:text;not null;index"`
	UserID      string `gorm:"type:text;not null;index"`
	Type        string `gorm:"type:text;not null"` // see lib/reactions
}

// ── Mentions & hashtags ───────────────────────────────────────────────────────

// Mention records that ActorID referenced MentionedUserID inside a subject.
// Stored rather than re-parsed so notifications, permission checks and
// "mentions of me" queries are all cheap.
type Mention struct {
	ID              string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt       time.Time
	SubjectType     string `gorm:"type:text;not null;index"` // post | comment | story
	SubjectID       string `gorm:"type:text;not null;index"`
	MentionedUserID string `gorm:"type:text;not null;index"`
	ActorID         string `gorm:"type:text;not null;index"`
}

// Hashtag is the canonical, lowercased tag with a denormalised usage counter
// that powers trending and the tag directory.
type Hashtag struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	Tag        string `gorm:"type:text;uniqueIndex;not null"` // lowercase, no '#'
	PostsCount int    `gorm:"default:0"`
	LastUsedAt time.Time
	// IsBlocked lets moderators suppress a tag from discovery without
	// deleting the posts that use it.
	IsBlocked bool `gorm:"default:false"`
}

// PostHashtag is the join row. Tag is denormalised alongside HashtagID so tag
// feeds need only one index lookup.
type PostHashtag struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	PostID    string `gorm:"type:text;not null;index"`
	HashtagID string `gorm:"type:text;not null;index"`
	Tag       string `gorm:"type:text;not null;index"`
}

// ── Post media ────────────────────────────────────────────────────────────────

// PostMedia is one attachment on a post. A separate table (rather than the old
// single Post.MediaUrl column) is what makes carousels, per-item dimensions and
// per-item thumbnails possible. Position orders the carousel.
//
// Width/Height are stored so the client can reserve the correct aspect box
// before the image loads, which is what removes feed layout shift.
type PostMedia struct {
	ID           string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	PostID       string         `gorm:"type:text;not null;index"`
	URL          string         `gorm:"type:text;not null"`
	ThumbnailURL string         `gorm:"type:text"`
	Kind         string         `gorm:"type:text;not null"` // image | video | file
	MimeType     string         `gorm:"type:text"`
	Width        int
	Height       int
	DurationMs   int
	SizeBytes    int64
	AltText      string `gorm:"type:text"` // accessibility
	Position     int    `gorm:"default:0"`
}

// MediaUpload is an audit row written for every accepted upload.
//
// It exists for three reasons that each justify it on their own: it is the
// durable row lib/ratelimit counts to enforce an upload quota (uploads
// otherwise leave no trace to count); it gives storage accounting a per-user
// byte total; and it lets a moderator find and purge every file an abusive
// account uploaded without hunting through posts, messages and stories
// separately.
type MediaUpload struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	UserID string `gorm:"type:text;not null;index"`
	URL    string `gorm:"type:text;not null"`
	// MimeType and Kind are the SNIFFED values from lib/mediaguard, never the
	// client's claim.
	MimeType  string `gorm:"type:text"`
	Kind      string `gorm:"type:text;index"` // image | video | audio | document
	SizeBytes int64
	Width     int
	Height    int

	// AttachedTo records where the file ended up, so orphaned uploads (chosen
	// but never posted) can be swept.
	AttachedType string `gorm:"type:text;index"` // post | message | story | profile | document
	AttachedID   string `gorm:"type:text;index"`

	// ModerationStatus lets staff quarantine a file without deleting the post
	// that references it.
	ModerationStatus string `gorm:"type:text;default:'active';index"`
}

// ── Bookmarks & collections ───────────────────────────────────────────────────

// Collection is a user-owned folder of saved content. Always private to the
// owner — there is no sharing surface, deliberately.
type Collection struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
	UserID     string         `gorm:"type:text;not null;index"`
	Name       string         `gorm:"type:text;not null"`
	ItemsCount int            `gorm:"default:0"`
}

// Bookmark saves a subject for a user, optionally filed into a Collection.
type Bookmark struct {
	ID           string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt    time.Time
	UserID       string  `gorm:"type:text;not null;index"`
	SubjectType  string  `gorm:"type:text;not null;index"` // post | job | event | document
	SubjectID    string  `gorm:"type:text;not null;index"`
	CollectionID *string `gorm:"type:text;index"`
	Note         string  `gorm:"type:text"`
}

// ── Feed control ──────────────────────────────────────────────────────────────

// FeedSignal is explicit negative feedback. The spec is emphatic that the feed
// must not be manipulative, so user control is a first-class stored signal
// rather than an opaque model weight.
type FeedSignal struct {
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UserID      string `gorm:"type:text;not null;index"`
	Signal      string `gorm:"type:text;not null"` // not_interested | hide_post | mute_hashtag
	SubjectType string `gorm:"type:text;not null"` // post | hashtag | author
	SubjectID   string `gorm:"type:text;not null;index"`
}

// ── Moderation & safety ───────────────────────────────────────────────────────

// Report is one user flagging a subject. Every report has a traceable
// lifecycle: open -> triaged -> resolved/dismissed, with the resolver and
// resolution recorded. SubjectOwnerID is denormalised at report time so the
// queue still shows who was reported after the content is deleted.
type Report struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time

	ReporterID     string `gorm:"type:text;not null;index"`
	SubjectType    string `gorm:"type:text;not null;index"` // post | comment | story | user | group | message
	SubjectID      string `gorm:"type:text;not null;index"`
	SubjectOwnerID string `gorm:"type:text;index"`

	Reason  string `gorm:"type:text;not null"` // see lib/moderation
	Details string `gorm:"type:text"`

	Status     string `gorm:"type:text;default:'open';index"` // open | triaged | resolved | dismissed
	Priority   int    `gorm:"default:0;index"`                // higher = more urgent
	AssignedTo string `gorm:"type:text;index"`

	ResolvedBy string `gorm:"type:text"`
	ResolvedAt *time.Time
	Resolution string `gorm:"type:text"` // free-text moderator note
	// SnapshotContent preserves what was reported, so a moderator can still
	// judge the report after the author edits or deletes the content.
	SnapshotContent string `gorm:"type:text"`
}

// ModerationAction is the append-only audit log. It answers the question the
// spec demands: who did what, when, where, against whom, and what action was
// taken. Never updated, never deleted.
type ModerationAction struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time

	ActorID    string `gorm:"type:text;not null;index"` // the moderator
	ActionType string `gorm:"type:text;not null;index"` // see lib/moderation

	SubjectType    string `gorm:"type:text;not null;index"`
	SubjectID      string `gorm:"type:text;not null;index"`
	SubjectOwnerID string `gorm:"type:text;index"`

	ReportID string `gorm:"type:text;index"`
	Reason   string `gorm:"type:text"`
	// Metadata is a JSON blob for action-specific detail (duration, previous
	// value, and so on). TEXT for the simple-protocol driver.
	Metadata string `gorm:"type:text"`
	// ExpiresAt is set for time-boxed actions (temporary restrictions).
	ExpiresAt *time.Time
}

// UserRestriction is an active sanction against a user. Checked on every
// write path via lib/moderation.CheckRestriction.
type UserRestriction struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time

	UserID string `gorm:"type:text;not null;index"`
	// Type: banned | post_restricted | comment_restricted | message_restricted
	Type     string `gorm:"type:text;not null;index"`
	Reason   string `gorm:"type:text"`
	IssuedBy string `gorm:"type:text;not null"`
	// ExpiresAt nil means permanent until lifted.
	ExpiresAt *time.Time
	LiftedAt  *time.Time
	LiftedBy  string `gorm:"type:text"`
}

// ── Stories ───────────────────────────────────────────────────────────────────

// Story is an ephemeral post. Rows are kept past ExpiresAt (for the author's
// own archive and for moderation) and filtered on read rather than deleted, so
// a report filed against an expired story is still reviewable.
type Story struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	AuthorID string `gorm:"type:text;not null;index"`
	Kind     string `gorm:"type:text;not null"` // text | image | video

	MediaURL     string `gorm:"type:text"`
	ThumbnailURL string `gorm:"type:text"`
	Width        int
	Height       int
	DurationMs   int

	Text            string `gorm:"type:text"`
	BackgroundColor string `gorm:"type:text"` // text stories
	// Overlays is a JSON array of positioned elements (text, stickers,
	// mentions, links) rendered over the media by the client.
	Overlays string `gorm:"type:text"`

	// Audience: everyone | connections | close_friends | custom
	Audience  string    `gorm:"type:text;default:'connections'"`
	ExpiresAt time.Time `gorm:"index"`

	ViewsCount     int `gorm:"default:0"`
	ReactionsCount int `gorm:"default:0"`
	RepliesCount   int `gorm:"default:0"`

	// PollID links an interactive poll overlay.
	PollID *string `gorm:"type:text;index"`
}

// StoryAudienceMember is the explicit allow-list for Audience == "custom".
type StoryAudienceMember struct {
	ID      string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	StoryID string `gorm:"type:text;not null;index"`
	UserID  string `gorm:"type:text;not null;index"`
}

// StoryView records one viewer seeing one story. Completed distinguishes a
// full watch from a skip, which is what makes the completion-rate metric
// meaningful.
type StoryView struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	StoryID   string `gorm:"type:text;not null;index"`
	ViewerID  string `gorm:"type:text;not null;index"`
	Completed bool   `gorm:"default:false"`
}

// ── Polls ─────────────────────────────────────────────────────────────────────

// Poll is attached to either a Post or a Story (exactly one owner).
type Poll struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	AuthorID    string `gorm:"type:text;not null;index"`
	Question    string `gorm:"type:text;not null"`
	IsAnonymous bool   `gorm:"default:false"`
	MultiChoice bool   `gorm:"default:false"`
	ExpiresAt   *time.Time
	TotalVotes  int `gorm:"default:0"`
	// HideResultsUntilVote makes results visible only after the viewer votes,
	// which measurably reduces bandwagon bias.
	HideResultsUntilVote bool `gorm:"default:true"`
}

type PollOption struct {
	ID         string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt  time.Time
	PollID     string `gorm:"type:text;not null;index"`
	Text       string `gorm:"type:text;not null"`
	Position   int    `gorm:"default:0"`
	VotesCount int    `gorm:"default:0"`
}

// PollVote is one user's choice. The unique index is on (poll, user, option)
// so a multi-choice poll can hold several rows per voter while a single-choice
// poll is enforced to one in the service layer.
type PollVote struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	PollID    string `gorm:"type:text;not null;index"`
	OptionID  string `gorm:"type:text;not null;index"`
	UserID    string `gorm:"type:text;not null;index"`
}

// ── Groups & communities ──────────────────────────────────────────────────────

// Community is the higher-level container. A community holds many Groups
// ("spaces"), which is what lets one student organisation run an announcements
// space, several subject groups and a social group without each being a
// disconnected island.
type Community struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	Name        string `gorm:"type:text;not null"`
	Slug        string `gorm:"type:text;uniqueIndex;not null"`
	Description string `gorm:"type:text"`
	AvatarURL   string `gorm:"type:text"`
	CoverURL    string `gorm:"type:text"`
	Category    string `gorm:"type:text;index"` // club | department | interest | project | organisation

	// Visibility: public (anyone may find and join) | restricted (findable,
	// join needs approval) | private (invite only, hidden from search).
	Visibility string `gorm:"type:text;default:'public';index"`

	CreatedBy    string `gorm:"type:text;not null;index"`
	MembersCount int    `gorm:"default:0"`
	GroupsCount  int    `gorm:"default:0"`

	// IsVerified marks an officially recognised student organisation.
	IsVerified bool `gorm:"default:false"`
	// Status lets staff suspend a whole community.
	Status string `gorm:"type:text;default:'active';index"` // active | suspended
}

// Group is a space where posting happens. CommunityID is nil for a standalone
// group (a study group between friends), set when the group is a space inside
// a community.
type Group struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	CommunityID *string `gorm:"type:text;index"`

	Name        string `gorm:"type:text;not null"`
	Slug        string `gorm:"type:text;uniqueIndex;not null"`
	Description string `gorm:"type:text"`
	AvatarURL   string `gorm:"type:text"`
	CoverURL    string `gorm:"type:text"`

	// Kind shapes the posting rules: discussion (all members post),
	// announcement (only admins post), qa, resource.
	Kind string `gorm:"type:text;default:'discussion'"`

	Visibility string `gorm:"type:text;default:'public';index"`
	// JoinPolicy: open | request | invite_only
	JoinPolicy string `gorm:"type:text;default:'open'"`

	CreatedBy    string `gorm:"type:text;not null;index"`
	MembersCount int    `gorm:"default:0"`
	PostsCount   int    `gorm:"default:0"`

	// PinnedPostID surfaces one post at the top of the group.
	PinnedPostID *string `gorm:"type:text"`
	Status       string  `gorm:"type:text;default:'active';index"`
}

// GroupMember carries the member's role and standing. Roles are hierarchical:
// owner > admin > moderator > member. Exactly one owner per group is enforced
// in the service layer, including on ownership transfer and owner departure.
type GroupMember struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time

	GroupID string `gorm:"type:text;not null;index"`
	UserID  string `gorm:"type:text;not null;index"`

	Role   string `gorm:"type:text;default:'member';index"` // owner | admin | moderator | member
	Status string `gorm:"type:text;default:'active';index"` // active | pending | banned | left

	JoinedAt   *time.Time
	InvitedBy  string `gorm:"type:text"`
	MutedUntil *time.Time
	// BannedUntil nil with Status=banned means a permanent ban.
	BannedUntil *time.Time
	BanReason   string `gorm:"type:text"`

	// NotificationLevel: all | mentions | none
	NotificationLevel string `gorm:"type:text;default:'mentions'"`
}

// CommunityMember mirrors GroupMember at the community level. Community
// membership is what grants discoverability of the community's public groups.
type CommunityMember struct {
	ID          string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	CommunityID string `gorm:"type:text;not null;index"`
	UserID      string `gorm:"type:text;not null;index"`
	Role        string `gorm:"type:text;default:'member';index"`
	Status      string `gorm:"type:text;default:'active';index"`
	JoinedAt    *time.Time
}

// GroupInvite is a shareable join code. Uses/MaxUses and ExpiresAt bound the
// blast radius of a leaked link.
type GroupInvite struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	GroupID   string `gorm:"type:text;not null;index"`
	Code      string `gorm:"type:text;uniqueIndex;not null"`
	CreatedBy string `gorm:"type:text;not null"`
	MaxUses   int    `gorm:"default:0"` // 0 = unlimited
	Uses      int    `gorm:"default:0"`
	ExpiresAt *time.Time
	RevokedAt *time.Time
}

// PushSubscription is one browser/device registered for Web Push.
//
// Endpoint is the unique key: re-subscribing on the same device replaces the
// row rather than accumulating dead endpoints. FailureCount lets a repeatedly
// failing endpoint be pruned without deleting on the first transient error.
type PushSubscription struct {
	ID        string `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	UserID   string `gorm:"type:text;not null;index"`
	Endpoint string `gorm:"type:text;not null;uniqueIndex"`
	// P256dh and Auth are the browser's encryption keys. They are useless
	// without the endpoint and cannot decrypt anything on their own.
	P256dh string `gorm:"type:text;not null"`
	Auth   string `gorm:"type:text;not null"`

	UserAgent    string `gorm:"type:text"`
	FailureCount int    `gorm:"default:0"`
	LastSentAt   *time.Time
}

// ── Analytics ─────────────────────────────────────────────────────────────────

// AnalyticsEvent is a privacy-conscious, append-only product event.
//
// Deliberately narrow: an actor, a verb, a subject and a small JSON property
// bag. No message bodies, no post content, no free-text the user typed — those
// would turn the analytics table into a second copy of everyone's data.
type AnalyticsEvent struct {
	ID        string    `gorm:"primaryKey;type:text;default:gen_random_uuid()"`
	CreatedAt time.Time `gorm:"index"`

	ActorID     string `gorm:"type:text;index"`
	Name        string `gorm:"type:text;not null;index"` // see lib/analytics
	SubjectType string `gorm:"type:text;index"`
	SubjectID   string `gorm:"type:text;index"`
	// Props is a small JSON object of non-sensitive dimensions.
	Props string `gorm:"type:text"`
}
