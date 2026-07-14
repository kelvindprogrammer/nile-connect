package db

import (
	"log"
	"os"
	"strings"
	"sync"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"nile-connect/lib/models"
)

var (
	mu       sync.Mutex
	instance *gorm.DB
)

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

	// Ensure SSL — required by Neon and most cloud Postgres providers
	if !strings.Contains(dsn, "sslmode=") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		dsn += sep + "sslmode=require"
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
	} {
		db.Exec(stmt)
	}
}
