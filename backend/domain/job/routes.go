package job

import (
	"github.com/gofiber/fiber/v2"
)

// Routes registers job domain routes
func Routes(app *fiber.App, handler *Handler, authMiddleware fiber.Handler) {
	// DEMO READY: Direct routes matching frontend expectations
	
	// Public job discovery routes
	app.Get("/api/student/jobs", handler.ListJobs)                    // DEMO: Student jobs list
	app.Get("/api/jobs/search", handler.SearchJobs)                   // DEMO: Job search
	app.Get("/api/jobs/:id", handler.GetJobDetails)                   // DEMO: Job details
	
	// Protected student routes (require authentication)
	studentGroup := app.Group("/api/student", authMiddleware)
	
	// Application tracking routes - CRITICAL FOR DEMO
	studentGroup.Get("/applications", handler.GetStudentApplications)  // DEMO: Application tracking
	studentGroup.Post("/jobs/:id/apply", handler.ApplyToJob)           // DEMO: Apply to job
	studentGroup.Post("/jobs/:id/save", handler.SaveJob)               // DEMO: Save job
	studentGroup.Delete("/jobs/:id/save", handler.UnsaveJob)           // DEMO: Unsave job
	studentGroup.Get("/saved-jobs", handler.GetSavedJobs)              // DEMO: Saved jobs list
	
	// Additional routes for CV/resume upload (stubs)
	studentGroup.Post("/career/cv", handler.UploadCV)                 // DEMO: CV Upload
	studentGroup.Post("/career/cv/:id/analyse", handler.AnalyseCV)    // DEMO: CV Analysis
	
	// Employer routes
	employerGroup := app.Group("/api/employer", authMiddleware)
	employerGroup.Post("/jobs", handler.CreateJob)                    // DEMO: Employer create job
	
	// Admin routes
	adminGroup := app.Group("/api/staff", authMiddleware)
	adminGroup.Post("/jobs/:id/approve", handler.ApproveJob)          // DEMO: Admin approve job
}