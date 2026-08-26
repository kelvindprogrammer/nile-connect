package db

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"nile-connect/lib/eventcat"
	"nile-connect/lib/models"
)

var (
	mu       sync.Mutex
	instance *gorm.DB
)

func init() {
	loadEnv()
}

func loadEnv() {
	checkPath := func(start string) bool {
		curr := start
		for i := 0; i < 10; i++ {
			for _, name := range []string{".env.local", ".env"} {
				p := filepath.Join(curr, name)
				if parseEnvFile(p) {
					return true
				}
			}
			parent := filepath.Dir(curr)
			if parent == curr {
				break
			}
			curr = parent
		}
		return false
	}

	if curr, err := os.Getwd(); err == nil {
		if checkPath(curr) {
			return
		}
	}
	if exe, err := os.Executable(); err == nil {
		checkPath(filepath.Dir(exe))
	}
}

func parseEnvFile(path string) bool {
	data, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
	return true
}

func Get() (*gorm.DB, error) {
	mu.Lock()
	defer mu.Unlock()

	if instance != nil {
		return instance, nil
	}

	dsn := dsn()
	if dsn == "" {
		dsn = "postgres://localhost:5432/nile_connect"
	}

	// Ensure SSL for cloud providers, disable for localhost unless explicitly configured
	if !strings.Contains(dsn, "sslmode=") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		if strings.Contains(dsn, "localhost") || strings.Contains(dsn, "127.0.0.1") {
			dsn += sep + "sslmode=disable"
		} else {
			dsn += sep + "sslmode=require"
		}
	}

	// PreferSimpleProtocol disables prepared statements so GORM works with
	// pgBouncer (used by Neon's pooled connections) without errors.
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	migrate(db)
	instance = db
	return instance, nil
}

// dsn tries several env-var names in priority order.
// Vercel+Neon injects STORAGE_* vars; standard deployments use DATABASE_URL.
func dsn() string {
	loadEnv()
	for _, key := range []string{
		"STORAGE_DATABASE_URL_UNPOOLED", // direct connection — best for DDL
		"STORAGE_DATABASE_URL",          // pooled connection
		"DATABASE_URL",                  // standard name
		"POSTGRES_URL",                  // alternate name
	} {
		if v := os.Getenv(key); v != "" {
			return v
		}
	}
	return ""
}

func migrate(db *gorm.DB) {
	db.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)

	// AutoMigrate each model independently. GORM's AutoMigrate aborts the
	// entire batch on the first error, which would silently prevent tables
	// later in the list (e.g. connections, service_requests) from ever being
	// created if an earlier model's migration fails on a warm DB. Running
	// them one-by-one and logging failures keeps the rest of the schema
	// in sync even when one model needs manual attention.
	for _, model := range []interface{}{
		&models.User{},
		&models.EmployerProfile{},
		&models.Job{},
		&models.Application{},
		&models.Event{},
		&models.EventRegistration{},
		&models.Post{},
		&models.PostLike{},
		&models.Message{},
		&models.PasswordReset{},
		&models.Notification{},
		&models.Comment{},
		&models.Connection{},
		&models.TypingStatus{},
		&models.ServiceRequest{},
		&models.Document{},
		&models.ApplicationStageHistory{},
		&models.ApplicationNote{},
		&models.EmailVerification{},
		&models.ProfileView{},
		&models.Endorsement{},

		// -- Social layer --
		&models.Follow{},
		&models.Block{},
		&models.Mute{},
		&models.CloseFriend{},
		&models.PrivacySettings{},
		&models.Reaction{},
		&models.Mention{},
		&models.Hashtag{},
		&models.PostHashtag{},
		&models.PostMedia{},
		&models.Collection{},
		&models.Bookmark{},
		&models.FeedSignal{},
		&models.MediaUpload{},
		&models.Report{},
		&models.ModerationAction{},
		&models.UserRestriction{},
		&models.Story{},
		&models.StoryAudienceMember{},
		&models.StoryView{},
		&models.Poll{},
		&models.PollOption{},
		&models.PollVote{},
		&models.Community{},
		&models.Group{},
		&models.GroupMember{},
		&models.CommunityMember{},
		&models.GroupInvite{},
		&models.AnalyticsEvent{},
		&models.PushSubscription{},
	} {
		if err := db.AutoMigrate(model); err != nil {
			log.Printf("automigrate %T: %v", model, err)
		}
	}

	// Explicit column additions for Campus One fields.
	// IF NOT EXISTS makes these safe to run on every cold start.
	// AutoMigrate can silently skip columns on warm/cached DB instances,
	// so we enforce the schema here as a belt-and-suspenders measure.
	for _, stmt := range []string{
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_one_sub TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS study_level TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty_id TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id TEXT`,
		`CREATE INDEX IF NOT EXISTS idx_users_campus_one_sub ON users(campus_one_sub)`,
		// Make password_hash nullable so SSO users can exist without a password.
		`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,

		// Presence + media attachments + social features.
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ`,
		`ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT`,
		`ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT`,
		`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)`,
		`CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id)`,
		`CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id)`,

		// CV / resume + job-application attachments.
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_url TEXT`,
		`ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT`,
		`ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url TEXT`,

		// Career services (mock interview / advisory / CV review).
		`CREATE INDEX IF NOT EXISTS idx_service_requests_student ON service_requests(student_id)`,
		`CREATE INDEX IF NOT EXISTS idx_service_requests_staff ON service_requests(staff_id)`,

		// GPA for ATS filtering/sorting.
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS gpa DOUBLE PRECISION DEFAULT 0`,

		// Employer profile — rich company page fields.
		`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT`,
		`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_size TEXT`,
		`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS headquarters TEXT`,
		`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`,
		`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS founded_year INTEGER`,

		// Jobs — opportunity type, remote flag, document requirements, approval trail.
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_category TEXT`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_docs TEXT`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS optional_docs TEXT`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_by TEXT`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,

		// Applications — pipeline stage + document package + withdrawal.
		`ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'submitted'`,
		`ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage_order INTEGER DEFAULT 0`,
		`ALTER TABLE applications ADD COLUMN IF NOT EXISTS document_ids TEXT`,
		`ALTER TABLE applications ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ`,
		`UPDATE applications SET stage = 'submitted' WHERE stage IS NULL OR stage = ''`,

		// Document library + ATS audit trail.
		`CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_app_stage_history_app ON application_stage_history(application_id)`,
		`CREATE INDEX IF NOT EXISTS idx_app_notes_app ON application_notes(application_id)`,
		`CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)`,

		// Feed enrichment — job-share posts + post kind.
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS job_id TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'text'`,
		`UPDATE posts SET kind = 'text' WHERE kind IS NULL OR kind = ''`,
		`CREATE INDEX IF NOT EXISTS idx_posts_job_id ON posts(job_id)`,

		// Social proof — profile views + skill endorsements.
		`CREATE INDEX IF NOT EXISTS idx_profile_views_subject ON profile_views(profile_user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_endorsements_subject ON endorsements(profile_user_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_endorsements_unique ON endorsements(endorser_id, profile_user_id, skill)`,

		// Extended profile — moved out of browser localStorage into the DB.
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_in TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS git_hub TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS experiences TEXT`,

		// Event registrations — one row per (event, student), enforced in the DB
		// so a double-submitted Register click can never inflate the count.
		`CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id)`,
		`CREATE INDEX IF NOT EXISTS idx_event_registrations_student ON event_registrations(student_id)`,
		`DELETE FROM event_registrations a USING event_registrations b
		   WHERE a.ctid < b.ctid AND a.event_id = b.event_id AND a.student_id = b.student_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_unique ON event_registrations(event_id, student_id)`,

		// Events — suggestion trail for student-proposed events.
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS suggested_by TEXT`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_by TEXT`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`,
		`UPDATE events SET status = 'pending' WHERE status IS NULL OR status = ''`,

		// -- Social layer --
		// Posts: audience, repost/quote links, counters, moderation state.
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'everyone'`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS group_id TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_of_id TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS quote_of_id TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_id TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_title TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_description TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_image_url TEXT`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS quotes_count INTEGER DEFAULT 0`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'active'`,
		`ALTER TABLE posts ADD COLUMN IF NOT EXISTS hot_score DOUBLE PRECISION DEFAULT 0`,
		// Backfill: rows written before these columns existed hold NULL, and a
		// NULL audience fails the visibility check closed, which would hide
		// every pre-existing post from everyone.
		`UPDATE posts SET audience = 'everyone' WHERE audience IS NULL OR audience = ''`,
		`UPDATE posts SET moderation_status = 'active' WHERE moderation_status IS NULL OR moderation_status = ''`,
		`UPDATE posts SET reactions_count = COALESCE(likes_count, 0) WHERE reactions_count IS NULL`,

		// Comments: one level of threading, reaction counter, moderation.
		`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id TEXT`,
		`ALTER TABLE comments ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0`,
		`ALTER TABLE comments ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0`,
		`ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`,
		`ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'active'`,
		`UPDATE comments SET moderation_status = 'active' WHERE moderation_status IS NULL OR moderation_status = ''`,

		// Notifications: grouping key + deep-link subject.
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_key TEXT`,
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_count INTEGER DEFAULT 1`,
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subject_type TEXT`,
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subject_id TEXT`,
		`UPDATE notifications SET actor_count = 1 WHERE actor_count IS NULL OR actor_count < 1`,

		// Social graph edges. Each unique index is what makes the ON CONFLICT
		// clauses in lib/socialgraph idempotent -- without them a double-tapped
		// Follow inserts twice. The de-dupe DELETE runs first so the index can
		// be built on data that may already contain duplicates.
		`DELETE FROM follows a USING follows b WHERE a.ctid < b.ctid AND a.follower_id = b.follower_id AND a.followee_id = b.followee_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique ON follows(follower_id, followee_id)`,
		`DELETE FROM blocks a USING blocks b WHERE a.ctid < b.ctid AND a.blocker_id = b.blocker_id AND a.blocked_id = b.blocked_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique ON blocks(blocker_id, blocked_id)`,
		`DELETE FROM mutes a USING mutes b WHERE a.ctid < b.ctid AND a.muter_id = b.muter_id AND a.muted_id = b.muted_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_mutes_unique ON mutes(muter_id, muted_id)`,
		`DELETE FROM close_friends a USING close_friends b WHERE a.ctid < b.ctid AND a.owner_id = b.owner_id AND a.friend_id = b.friend_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_close_friends_unique ON close_friends(owner_id, friend_id)`,
		`DELETE FROM reactions a USING reactions b WHERE a.ctid < b.ctid AND a.subject_type = b.subject_type AND a.subject_id = b.subject_id AND a.user_id = b.user_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique ON reactions(subject_type, subject_id, user_id)`,
		`DELETE FROM post_hashtags a USING post_hashtags b WHERE a.ctid < b.ctid AND a.post_id = b.post_id AND a.tag = b.tag`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_post_hashtags_unique ON post_hashtags(post_id, tag)`,
		`DELETE FROM bookmarks a USING bookmarks b WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.subject_type = b.subject_type AND a.subject_id = b.subject_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_unique ON bookmarks(user_id, subject_type, subject_id)`,
		`DELETE FROM feed_signals a USING feed_signals b WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.signal = b.signal AND a.subject_type = b.subject_type AND a.subject_id = b.subject_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_signals_unique ON feed_signals(user_id, signal, subject_type, subject_id)`,
		`DELETE FROM story_views a USING story_views b WHERE a.ctid < b.ctid AND a.story_id = b.story_id AND a.viewer_id = b.viewer_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_story_views_unique ON story_views(story_id, viewer_id)`,
		`DELETE FROM poll_votes a USING poll_votes b WHERE a.ctid < b.ctid AND a.poll_id = b.poll_id AND a.user_id = b.user_id AND a.option_id = b.option_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique ON poll_votes(poll_id, user_id, option_id)`,
		`DELETE FROM group_members a USING group_members b WHERE a.ctid < b.ctid AND a.group_id = b.group_id AND a.user_id = b.user_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group_id, user_id)`,
		`DELETE FROM community_members a USING community_members b WHERE a.ctid < b.ctid AND a.community_id = b.community_id AND a.user_id = b.user_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_community_members_unique ON community_members(community_id, user_id)`,
		`DELETE FROM story_audience_members a USING story_audience_members b WHERE a.ctid < b.ctid AND a.story_id = b.story_id AND a.user_id = b.user_id`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_story_audience_unique ON story_audience_members(story_id, user_id)`,

		// Read-path indexes.
		`CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id)`,
		`CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id)`,
		`CREATE INDEX IF NOT EXISTS idx_reactions_subject ON reactions(subject_type, subject_id)`,
		`CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_mentions_subject ON mentions(subject_type, subject_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag)`,
		`CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(tag)`,
		`CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id, position)`,
		`CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON bookmarks(collection_id)`,
		`CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_feed_signals_user ON feed_signals(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_media_uploads_user_time ON media_uploads(user_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_media_uploads_attached ON media_uploads(attached_type, attached_id)`,

		// Moderation queue and audit trail.
		`CREATE INDEX IF NOT EXISTS idx_reports_queue ON reports(status, priority, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_reports_subject ON reports(subject_type, subject_id)`,
		`CREATE INDEX IF NOT EXISTS idx_reports_owner ON reports(subject_owner_id)`,
		`CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_mod_actions_subject ON moderation_actions(subject_type, subject_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_mod_actions_owner ON moderation_actions(subject_owner_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_mod_actions_actor ON moderation_actions(actor_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_user_restrictions_active ON user_restrictions(user_id, type, lifted_at)`,

		// Stories, polls, groups.
		`CREATE INDEX IF NOT EXISTS idx_stories_author_expiry ON stories(author_id, expires_at)`,
		`CREATE INDEX IF NOT EXISTS idx_stories_expiry ON stories(expires_at)`,
		`CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id, position)`,
		`CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug)`,
		`CREATE INDEX IF NOT EXISTS idx_groups_community ON groups(community_id)`,
		`CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id, status)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_group_invites_code ON group_invites(code)`,

		// Feed read path. Without these a 15,000-student feed is a seq scan.
		`CREATE INDEX IF NOT EXISTS idx_posts_author_time ON posts(author_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_posts_group_time ON posts(group_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_comments_post_parent ON comments(post_id, parent_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_analytics_name_time ON analytics_events(name, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_analytics_actor ON analytics_events(actor_id, created_at)`,

		// Push subscriptions. Endpoint is unique so a device re-subscribing
		// replaces its row instead of leaving a dead endpoint behind.
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint)`,
		`CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)`,
	} {
		db.Exec(stmt)
	}

	normalizeEventCategories(db)
}

// normalizeEventCategories rewrites legacy events.category spellings onto the
// canonical eventcat slugs. Historically staff wrote "Career Fair" and
// employers wrote "career_fair" for the same thing, so category filtering
// matched nothing. Running this on every cold start is idempotent: rows that
// already hold a canonical slug are skipped by the WHERE clause.
func normalizeEventCategories(db *gorm.DB) {
	var rows []struct {
		ID       string
		Category string
	}
	if err := db.Raw(`SELECT id, category FROM events WHERE deleted_at IS NULL`).Scan(&rows).Error; err != nil {
		return
	}
	for _, row := range rows {
		canonical := eventcat.Normalize(row.Category)
		if canonical == row.Category {
			continue
		}
		if err := db.Exec(`UPDATE events SET category = ? WHERE id = ?`, canonical, row.ID).Error; err != nil {
			log.Printf("normalize event category %s: %v", row.ID, err)
		}
	}
}
