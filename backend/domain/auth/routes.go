package auth

import (
	"github.com/gofiber/fiber/v2"
)

// SetupRoutes registers authentication routes
func SetupRoutes(app *fiber.App, handler *Handler) {
	authGroup := app.Group("/auth")

	// Health check
	authGroup.Get("/health", handler.Health)

	// Authentication routes
	authGroup.Post("/login", handler.Login)
	authGroup.Post("/register/student", handler.StudentRegistration)
	authGroup.Post("/register/employer", handler.EmployerRegistration)
	authGroup.Post("/profile/complete", handler.CompleteStudentProfile)

	// Password reset
	authGroup.Post("/forgot-password", handler.ForgotPassword)
	authGroup.Post("/reset-password", handler.ResetPassword)
}
