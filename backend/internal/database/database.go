package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func New(databaseURL string) (*gorm.DB, error) {
	// DEMO MODE: Support SQLite for local development/demo
	if strings.HasPrefix(databaseURL, "sqlite://") {
		dbPath := strings.TrimPrefix(databaseURL, "sqlite://")
		db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to SQLite database: %w", err)
		}
		log.Println("Connected to SQLite database successfully (Demo Mode)")
		return db, nil
	}

	// Production: PostgreSQL
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Connected to database successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	// Check if we're using SQLite (demo mode) or PostgreSQL
	var sqliteMode bool
	dialector := db.Dialector.Name()
	if dialector == "sqlite" {
		sqliteMode = true
		log.Println("Running migrations in SQLite (Demo Mode)")
	}

	if sqliteMode {
		// Use SQLite-compatible migrations for demo mode
		err := migrateSQLite(db)
		if err != nil {
			return fmt.Errorf("failed to migrate SQLite database: %w", err)
		}
	} else {
		// Create ALL PostgreSQL ENUM types before AutoMigrate.
		// Use sqlDB.Exec (not gorm Exec) to avoid GORM misparsing $$ as placeholders.
		sqlDB, dbErr := db.DB()
		if dbErr != nil {
			return fmt.Errorf("failed to get sql.DB: %w", dbErr)
		}
		type enumDef struct{ name, values string }
		enumDefs := []enumDef{
			{"role", "'student','staff','employer'"},
			{"student_subtype", "'current','alumni'"},
			{"employer_status", "'pending','approved','rejected'"},
			{"job_type", "'internship','full-time','part-time','remote','hybrid'"},
			{"job_status", "'pending','active','rejected','archived'"},
			{"application_status", "'saved','applied','interview','offer','rejected'"},
			{"event_category", "'tech','workshop','fair','webinar'"},
			{"report_type", "'weekly','monthly'"},
		}
		for _, e := range enumDefs {
			// Check if type exists before creating
			var exists bool
			row := sqlDB.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = $1)", e.name)
			if err := row.Scan(&exists); err != nil {
				return fmt.Errorf("failed to check enum %s: %w", e.name, err)
			}
			if !exists {
				q := fmt.Sprintf("CREATE TYPE %s AS ENUM (%s)", e.name, e.values)
				if _, execErr := sqlDB.Exec(q); execErr != nil {
					return fmt.Errorf("failed to create enum %s: %w", e.name, execErr)
				}
			}
		}

		// Use production migrations for PostgreSQL
		err := db.AutoMigrate(
			&User{},
			&EmployerProfile{},
			&Job{},
			&Application{},
			&Event{},
			&EventRegistration{},
			&Post{},
			&PostLike{},
			&CVDocument{},
			&AdvisorSlot{},
			&Report{},
		)
		if err != nil {
			return fmt.Errorf("failed to migrate database: %w", err)
		}
	}

	log.Println("Database migrated successfully")
	return nil
}

// SQLite-compatible model definitions for demo mode
type SQLiteUser struct {
	gorm.Model
	ID             string `gorm:"primaryKey;autoIncrement"`
	FullName       string `gorm:"not null"`
	Username       string `gorm:"uniqueIndex;not null"`
	Email          string `gorm:"uniqueIndex;not null"`
	PasswordHash   string `gorm:"not null"`
	Role           string `gorm:"not null"`
	StudentSubtype *string
	Major          string
	GraduationYear int
	IsVerified     bool `gorm:"default:false"`
}

type SQLiteEmployerProfile struct {
	gorm.Model
	ID           string `gorm:"primaryKey;autoIncrement"`
	UserID       string `gorm:"not null;index"`
	CompanyName  string `gorm:"not null"`
	Industry     string `gorm:"not null"`
	Location     string `gorm:"not null"`
	About        string `gorm:"type:text"`
	ContactEmail string `gorm:"not null"`
	Website      string
	Status       string `gorm:"default:pending"`
}

type SQLiteJob struct {
	gorm.Model
	ID             string `gorm:"primaryKey;autoIncrement"`
	EmployerID     string `gorm:"not null;index"`
	Title          string `gorm:"not null"`
	Type           string `gorm:"not null"`
	Location       string `gorm:"not null"`
	Salary         string
	Description    string `gorm:"type:text;not null"`
	Requirements   string `gorm:"type:text;not null"`
	Deadline       time.Time
	Skills         string `gorm:"type:text"`
	Status         string `gorm:"default:pending"`
	ApplicantCount int    `gorm:"default:0"`
}

type SQLiteApplication struct {
	gorm.Model
	ID        string `gorm:"primaryKey;autoIncrement"`
	JobID     string `gorm:"not null;index"`
	StudentID string `gorm:"not null;index"`
	Status    string `gorm:"default:saved"`
	AppliedAt *time.Time
}

func migrateSQLite(db *gorm.DB) error {
	// Create SQLite-compatible tables
	err := db.AutoMigrate(
		&SQLiteUser{},
		&SQLiteEmployerProfile{},
		&SQLiteJob{},
		&SQLiteApplication{},
	)
	if err != nil {
		return err
	}

	// Seed demo data for SQLite mode
	return seedDemoData(db)
}

func seedDemoData(db *gorm.DB) error {
	// Check if demo data already exists
	var userCount int64
	db.Model(&SQLiteUser{}).Count(&userCount)

	if userCount > 0 {
		log.Println("Demo data already exists")
		return nil
	}

	// Create demo users
	demoUsers := []SQLiteUser{
		{
			ID:             "1",
			FullName:       "Demo Student",
			Username:       "demo_student",
			Email:          "student@demo.edu",
			PasswordHash:   "$2a$10$demo_hash_for_demo_only_student",
			Role:           "student",
			StudentSubtype: func() *string { s := "current"; return &s }(),
			Major:          "Computer Science",
			GraduationYear: 2025,
			IsVerified:     true,
		},
		{
			ID:           "2",
			FullName:     "Demo Employer",
			Username:     "demo_employer",
			Email:        "employer@demo.com",
			PasswordHash: "$2a$10$demo_hash_for_demo_only_employer",
			Role:         "employer",
			IsVerified:   true,
		},
		{
			ID:           "3",
			FullName:     "Demo Staff",
			Username:     "demo_staff",
			Email:        "staff@demo.edu",
			PasswordHash: "$2a$10$demo_hash_for_demo_only_staff",
			Role:         "staff",
			IsVerified:   true,
		},
	}

	for _, user := range demoUsers {
		if err := db.Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create demo user: %w", err)
		}
	}

	log.Println("Demo data seeded successfully")
	return nil
}
