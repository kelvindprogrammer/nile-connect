package main

import (
	"log"

	"github.com/nile-connect/backend/internal/ai"
	"github.com/nile-connect/backend/internal/config"
	"github.com/nile-connect/backend/internal/database"
	"github.com/nile-connect/backend/internal/server"
)

func main() {
	// 1. Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// 2. Initialize database connection
	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 3. Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// 4. Create AI client
	aiClient := ai.NewClient(cfg.AIAPIKey, cfg.AIAPIURL)

	// 5. Create Fiber app
	app := server.New(cfg, db, aiClient)

	// 6. Start server
	log.Println("Nile Connect API running on port " + cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}
