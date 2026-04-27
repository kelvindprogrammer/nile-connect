package server

import (
	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nile-connect/backend/domain/application"
	"github.com/nile-connect/backend/domain/auth"
	"github.com/nile-connect/backend/domain/catchup"
	"github.com/nile-connect/backend/domain/employer"
	"github.com/nile-connect/backend/domain/event"
	"github.com/nile-connect/backend/domain/job"
	"github.com/nile-connect/backend/domain/messages"
	"github.com/nile-connect/backend/domain/staff"
	"github.com/nile-connect/backend/domain/student"
	"github.com/nile-connect/backend/internal/ai"
	"github.com/nile-connect/backend/internal/config"
	"github.com/nile-connect/backend/internal/middleware"
	"gorm.io/gorm"
)

func New(cfg *config.Config, db *gorm.DB, aiClient *ai.Client) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Use(middleware.CORS(cfg.AllowedOrigins))
	app.Use(fiberlogger.New())

	// Handle all CORS preflight requests globally
	app.Options("/*", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": "1.0.0"})
	})

	authMiddleware := middleware.Auth(cfg.JWTSecret)

	setupAuth(app, cfg, db)
	setupStudent(app, db, authMiddleware)
	setupStaff(app, db, authMiddleware)
	setupEmployer(app, db, authMiddleware)
	setupJob(app, db, authMiddleware)
	setupEvent(app, db, authMiddleware)
	setupFeed(app, db, authMiddleware)
	setupMessages(app, db, authMiddleware)

	return app
}

func setupAuth(app *fiber.App, cfg *config.Config, db *gorm.DB) {
	var svc auth.AuthService
	if db != nil {
		repo := auth.NewRepository(db)
		tokenSvc := auth.NewTokenService(cfg)
		svc = auth.NewService(repo, tokenSvc)
	} else {
		svc = auth.NewDemoService(cfg)
	}
	auth.SetupRoutes(app, auth.NewHandler(svc))
}

func setupStudent(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	repo := student.NewRepository(db)
	svc := student.NewService(repo)
	student.SetupRoutes(app, student.NewHandler(svc), authMiddleware)
}

func setupStaff(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	repo := staff.NewRepository(db)
	svc := staff.NewService(repo)
	staff.SetupRoutes(app, staff.NewHandler(svc), authMiddleware)
}

func setupEmployer(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	repo := employer.NewRepository(db)
	svc := employer.NewService(repo)
	employer.Routes(app, employer.NewHandler(svc), authMiddleware)
}

func setupJob(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	jobRepo := job.NewRepository(db)
	appRepo := application.NewRepository(db)
	svc := job.NewService(jobRepo, appRepo)
	job.Routes(app, job.NewHandler(svc), authMiddleware)
}

func setupEvent(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	repo := event.NewRepository(db)
	svc := event.NewService(repo)
	event.SetupRoutes(app, event.NewHandler(svc), authMiddleware)
}

func setupFeed(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	repo := catchup.NewRepository(db)
	svc := catchup.NewService(repo)
	catchup.SetupRoutes(app, catchup.NewHandler(svc), authMiddleware)
}

func setupMessages(app *fiber.App, db *gorm.DB, authMiddleware fiber.Handler) {
	repo := messages.NewRepository(db)
	messages.SetupRoutes(app, messages.NewHandler(repo), authMiddleware)
}
