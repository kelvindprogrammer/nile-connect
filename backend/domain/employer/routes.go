package employer

import (
	"github.com/gofiber/fiber/v2"
)

// Routes registers employer domain routes
func Routes(app *fiber.App, handler *Handler, authMiddleware fiber.Handler) {
	v1 := app.Group("/api/v1")
	
	// Protected employer routes
	employer := v1.Group("/employer", authMiddleware)
	
	// Profile routes
	profile := employer.Group("/profile")
	profile.Get("/", handler.GetProfile)              // GET /api/v1/employer/profile
	profile.Put("/", handler.UpdateProfile)           // PUT /api/v1/employer/profile
	
	// Job routes
	jobs := employer.Group("/jobs")
	jobs.Post("/", handler.PostJob)                    // POST /api/v1/employer/jobs
	jobs.Get("/", handler.GetEmployerJobs)             // GET /api/v1/employer/jobs
	jobs.Put("/:id", handler.UpdateJob)                // PUT /api/v1/employer/jobs/:id
	jobs.Delete("/:id", handler.DeleteJob)             // DELETE /api/v1/employer/jobs/:id
	
	// Application routes
	applications := employer.Group("/applications")
	applications.Put("/:id/status", handler.UpdateApplicationStatus) // PUT /api/v1/employer/applications/:id/status
	
	// Job applications route
	jobs.Get("/:id/applications", handler.GetJobApplications)  // GET /api/v1/employer/jobs/:id/applications
}