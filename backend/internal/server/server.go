package server

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nile-connect/backend/domain/application"
	"github.com/nile-connect/backend/domain/auth"
	"github.com/nile-connect/backend/domain/employer"
	"github.com/nile-connect/backend/domain/job"
	"github.com/nile-connect/backend/internal/ai"
	"github.com/nile-connect/backend/internal/config"
	"github.com/nile-connect/backend/internal/middleware"
	"gorm.io/gorm"
)

func New(cfg *config.Config, db *gorm.DB, aiClient *ai.Client) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(middleware.CORS(cfg.AllowedOrigins))
	app.Use(logger.New())

	// Health check (public)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Build the real JWT auth middleware using the configured secret
	authMiddleware := middleware.Auth(cfg.JWTSecret)

	// Register all domains
	setupAuthDomain(app, cfg, db)
	setupJobDomain(app, db, authMiddleware)
	setupEmployerDomain(app, db, authMiddleware)

	return app
}

// setupAuthDomain configures authentication routes (public – no auth middleware)
func setupAuthDomain(app *fiber.App, cfg *config.Config, db *gorm.DB) {
	var authService auth.AuthService

	if db != nil {
		authRepo := auth.NewRepository(db)
		authTokenSvc := auth.NewTokenService(cfg)
		authService = auth.NewService(authRepo, authTokenSvc)
	} else {
		// Demo / no-DB mode
		authService = auth.NewDemoService(cfg)
	}

	authHandler := auth.NewHandler(authService)
	auth.SetupRoutes(app, authHandler)
}

// setupJobDomain configures job + application routes with real JWT protection
func setupJobDomain(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	jobRepo := job.NewRepository(db)
	appRepo := application.NewRepository(db)
	jobService := job.NewService(jobRepo, appRepo)
	jobHandler := job.NewHandler(jobService)

	job.Routes(app, jobHandler, authMiddleware)
}

// setupEmployerDomain configures employer routes with real JWT protection
func setupEmployerDomain(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	employerRepo := employer.NewRepository(db)
	employerService := employer.NewService(employerRepo)
	employerHandler := employer.NewHandler(employerService)

	employer.Routes(app, employerHandler, authMiddleware)
}
