package testutils

import (
	"github.com/nile-connect/backend/internal/database"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// NewTestDB creates an in-memory SQLite database for testing
func NewTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to test database")
	}

	// Auto-migrate all tables
	err = db.AutoMigrate(
		&database.User{},
		&database.EmployerProfile{},
		&database.Job{},
		&database.Application{},
	)
	if err != nil {
		panic("failed to migrate test database")
	}

	return db
}

// CleanupTestDB closes the test database connection
func CleanupTestDB(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		return
	}
	sqlDB.Close()
}