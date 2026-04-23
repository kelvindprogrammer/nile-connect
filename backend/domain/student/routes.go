package student

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/config"
	"github.com/nile-connect/backend/internal/middleware"
)

// SetupRoutes registers student routes
func SetupRoutes(app *fiber.App, cfg *config.Config, handler *Handler) {
	studentGroup := app.Group("/students")

	// Apply authentication middleware for all student routes
	studentGroup.Use(middleware.Auth(cfg.JWTSecret))

	// Health check
	studentGroup.Get("/health", handler.Health)

	// Profile routes
	studentGroup.Get("/profile", handler.GetProfile)
	studentGroup.Put("/profile", handler.UpdateProfile)

	// CV routes
	studentGroup.Post("/cv", handler.UploadCV)
	studentGroup.Get("/cv/:cvID", handler.GetCV)
	studentGroup.Delete("/cv/:cvID", handler.DeleteCV)

	// Job application routes
	studentGroup.Post("/applications", handler.ApplyToJob)
	studentGroup.Get("/applications", handler.GetApplications)

	// Job search route (public but could be protected if needed)
	app.Get("/jobs", handler.SearchJobs)
}
