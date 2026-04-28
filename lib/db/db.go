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
	)
}
