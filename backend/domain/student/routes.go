package student

import (
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, handler *Handler, authMiddleware fiber.Handler) {
	g := app.Group("/students", authMiddleware)

	g.Get("/profile", handler.GetProfile)
	g.Put("/profile", handler.UpdateProfile)

	g.Post("/cv", handler.UploadCV)
	g.Get("/cv/:cvID", handler.GetCV)
	g.Delete("/cv/:cvID", handler.DeleteCV)

	g.Post("/applications", handler.ApplyToJob)
	g.Get("/applications", handler.GetApplications)

	// Public job search
	app.Get("/jobs/search", handler.SearchJobs)
}
