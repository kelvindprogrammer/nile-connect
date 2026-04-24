package staff

import "github.com/gofiber/fiber/v2"

func SetupRoutes(app *fiber.App, handler *Handler, authMiddleware fiber.Handler) {
	g := app.Group("/staff", authMiddleware)

	g.Get("/profile", handler.GetProfile)
	g.Get("/dashboard", handler.GetDashboard)
	g.Get("/applications", handler.GetApplications)
	g.Get("/jobs", handler.GetJobs)
	g.Put("/jobs/:id/status", handler.UpdateJobStatus)
	g.Get("/employers", handler.GetEmployers)
	g.Put("/employers/:id/status", handler.UpdateEmployerStatus)
	g.Get("/students", handler.GetStudents)
}
