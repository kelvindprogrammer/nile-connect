package db

import (
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

	// AutoMigrate creates new tables and adds missing columns.
	db.AutoMigrate(
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
	)

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
	} {
		db.Exec(stmt)
	}
}
