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

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://localhost:5432/nile_connect"
	}

	// Neon (and most cloud Postgres) requires SSL — add it if missing
	if !strings.Contains(dsn, "sslmode=") {
		if strings.Contains(dsn, "?") {
			dsn += "&sslmode=require"
		} else {
			dsn += "?sslmode=require"
		}
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	migrate(db)
	instance = db
	return instance, nil
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
	)
}
