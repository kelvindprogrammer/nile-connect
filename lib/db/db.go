package db

import (
	"os"
	"sync"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"nile-connect/lib/models"
)

var (
	once     sync.Once
	instance *gorm.DB
	initErr  error
)

func Get() (*gorm.DB, error) {
	once.Do(func() {
		dsn := os.Getenv("DATABASE_URL")
		if dsn == "" {
			dsn = "postgres://localhost:5432/nile_connect"
		}
		instance, initErr = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if initErr == nil {
			migrate(instance)
		}
	})
	return instance, initErr
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
