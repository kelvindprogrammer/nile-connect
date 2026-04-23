package database

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func New(databaseURL string) (*gorm.DB, error) {
	if strings.HasPrefix(databaseURL, "sqlite://") {
		dbPath := strings.TrimPrefix(databaseURL, "sqlite://")
		db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to SQLite database: %w", err)
		}
		log.Println("Connected to SQLite database successfully (Demo Mode)")
		return db, nil
	}

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	log.Println("Connected to database successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	if db.Dialector.Name() == "sqlite" {
		if err := migrateSQLite(db); err != nil {
			return fmt.Errorf("failed to migrate SQLite database: %w", err)
		}
		log.Println("Database migrated successfully")
		return nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Check if migration has already completed successfully
	var alreadyMigrated bool
	row := sqlDB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_schema_version')",
	)
	if err := row.Scan(&alreadyMigrated); err != nil {
		log.Printf("Warning: could not check migration state: %v", err)
	}
	if alreadyMigrated {
		log.Println("Schema already up to date, skipping migration")
		return nil
	}

	// Drop any partially-created tables and stale enum types from previous failed runs
	cleanupSQL := []string{
		`DROP TABLE IF EXISTS reports, advisor_slots, cv_documents, post_likes, posts, event_registrations, events, applications, jobs, employer_profiles, users CASCADE`,
		`DROP TYPE IF EXISTS role, student_subtype, employer_status, job_type, job_status, application_status, event_category, report_type CASCADE`,
	}
	for _, q := range cleanupSQL {
		if _, err := sqlDB.Exec(q); err != nil {
			log.Printf("Warning during cleanup: %v", err)
		}
	}

	// Build full schema using plain TEXT columns (no PostgreSQL enums)
	// This avoids all GORM enum-scanning issues completely
	schema := `
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    full_name       TEXT        NOT NULL,
    username        TEXT        UNIQUE NOT NULL,
    email           TEXT        UNIQUE NOT NULL,
    password_hash   TEXT        NOT NULL,
    role            TEXT        NOT NULL,
    student_subtype TEXT,
    major           TEXT,
    graduation_year INTEGER,
    is_verified     BOOLEAN     DEFAULT FALSE
);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

CREATE TABLE employer_profiles (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,
    user_id       TEXT        NOT NULL,
    company_name  TEXT        NOT NULL,
    industry      TEXT        NOT NULL,
    location      TEXT        NOT NULL,
    about         TEXT,
    contact_email TEXT        NOT NULL,
    website       TEXT,
    linkedin      TEXT,
    status        TEXT        DEFAULT 'pending'
);
CREATE INDEX idx_employer_profiles_user_id   ON employer_profiles(user_id);
CREATE INDEX idx_employer_profiles_deleted_at ON employer_profiles(deleted_at);

CREATE TABLE jobs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    employer_id     TEXT        NOT NULL,
    title           TEXT        NOT NULL,
    type            TEXT        NOT NULL,
    location        TEXT        NOT NULL,
    salary          TEXT,
    description     TEXT        NOT NULL,
    requirements    TEXT        NOT NULL,
    deadline        TIMESTAMPTZ,
    skills          TEXT,
    status          TEXT        DEFAULT 'pending',
    applicant_count INTEGER     DEFAULT 0
);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_deleted_at  ON jobs(deleted_at);

CREATE TABLE applications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    job_id     TEXT        NOT NULL,
    student_id TEXT        NOT NULL,
    status     TEXT        DEFAULT 'saved',
    applied_at TIMESTAMPTZ
);
CREATE INDEX idx_applications_job_id     ON applications(job_id);
CREATE INDEX idx_applications_student_id ON applications(student_id);
CREATE INDEX idx_applications_deleted_at ON applications(deleted_at);

CREATE TABLE events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    organiser_id        TEXT        NOT NULL,
    organiser_type      TEXT        NOT NULL,
    title               TEXT        NOT NULL,
    category            TEXT        NOT NULL,
    date                TIMESTAMPTZ NOT NULL,
    time                TEXT        NOT NULL,
    location            TEXT        NOT NULL,
    description         TEXT        NOT NULL,
    capacity            INTEGER     NOT NULL,
    registrations_count INTEGER     DEFAULT 0,
    attendance_count    INTEGER     DEFAULT 0,
    is_featured         BOOLEAN     DEFAULT FALSE,
    status              TEXT        DEFAULT 'pending'
);
CREATE INDEX idx_events_organiser_id ON events(organiser_id);
CREATE INDEX idx_events_deleted_at   ON events(deleted_at);

CREATE TABLE event_registrations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,
    event_id      TEXT        NOT NULL,
    student_id    TEXT        NOT NULL,
    registered_at TIMESTAMPTZ
);
CREATE INDEX idx_event_registrations_event_id   ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_student_id ON event_registrations(student_id);

CREATE TABLE posts (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    author_id      TEXT        NOT NULL,
    author_type    TEXT        NOT NULL,
    content        TEXT        NOT NULL,
    media_url      TEXT,
    likes_count    INTEGER     DEFAULT 0,
    comments_count INTEGER     DEFAULT 0
);
CREATE INDEX idx_posts_author_id  ON posts(author_id);
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at);

CREATE TABLE post_likes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    post_id    TEXT        NOT NULL,
    user_id    TEXT        NOT NULL
);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);

CREATE TABLE cv_documents (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    student_id        TEXT        NOT NULL,
    file_url          TEXT        NOT NULL,
    original_filename TEXT        NOT NULL,
    analysis_result   TEXT,
    uploaded_at       TIMESTAMPTZ
);
CREATE INDEX idx_cv_documents_student_id ON cv_documents(student_id);

CREATE TABLE advisor_slots (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    advisor_name    TEXT        NOT NULL,
    speciality      TEXT        NOT NULL,
    rating          FLOAT,
    available_times TEXT
);

CREATE TABLE reports (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    staff_id     TEXT        NOT NULL,
    type         TEXT        NOT NULL,
    generated_at TIMESTAMPTZ,
    file_url     TEXT
);
CREATE INDEX idx_reports_staff_id ON reports(staff_id);

CREATE TABLE _schema_version (
    version     TEXT        PRIMARY KEY,
    migrated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO _schema_version (version) VALUES ('v1');
`

	if _, err := sqlDB.Exec(schema); err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	log.Println("Database migrated successfully")
	return nil
}
