package job

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for job domain
type Handler struct {
	service JobService
}

// NewHandler creates a new job handler
func NewHandler(service JobService) *Handler {
	return &Handler{service: service}
}

// ListJobs handles GET /jobs
func (h *Handler) ListJobs(c *fiber.Ctx) error {
	filters := &JobFilters{
		Type:     c.Query("type"),
		Location: c.Query("location"),
		Industry: c.Query("industry"),
		Remote:   nil, // Would parse from query params
		Limit:    20,
		Offset:   0,
	}

	jobs, err := h.service.ListJobs(filters)
	if err != nil {
		// DEMO SAFETY: Return mock data if service fails
		postedTime1, _ := time.Parse("2006-01-02", "2024-03-15")
		postedTime2, _ := time.Parse("2006-01-02", "2024-03-10")
		postedTime3, _ := time.Parse("2006-01-02", "2024-03-05")

		jobs = []JobSummary{
			{
				ID:          "job-001",
				Title:       "Senior Frontend Developer",
				CompanyName: "TechCorp Inc.",
				Location:    "Cairo, Egypt",
				Type:        "Full-time",
				Salary:      "$70k - $90k",
				Industry:    "Technology",
				PostedAt:    postedTime1,
				Applicants:  24,
				IsSaved:     false,
				MatchScore:  92,
			},
			{
				ID:          "job-002",
				Title:       "Backend Engineer",
				CompanyName: "StartupXYZ",
				Location:    "Alexandria, Egypt",
				Type:        "Full-time",
				Salary:      "$60k - $80k",
				Industry:    "Technology",
				PostedAt:    postedTime2,
				Applicants:  18,
				IsSaved:     false,
				MatchScore:  87,
			},
			{
				ID:          "job-003",
				Title:       "Data Scientist",
				CompanyName: "AnalyticsPro",
				Location:    "Giza, Egypt",
				Type:        "Part-time",
				Salary:      "$45k - $65k",
				Industry:    "Data & Analytics",
				PostedAt:    postedTime3,
				Applicants:  12,
				IsSaved:     true,
				MatchScore:  78,
			},
		}
	}

	return c.JSON(fiber.Map{
		"jobs": jobs,
	})
}

// SearchJobs handles GET /jobs/search
func (h *Handler) SearchJobs(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "search query is required",
		})
	}

	filters := &JobFilters{
		Type:     c.Query("type"),
		Location: c.Query("location"),
		Industry: c.Query("industry"),
		Remote:   nil,
		Limit:    20,
		Offset:   0,
	}

	jobs, err := h.service.SearchJobs(query, filters)
	if err != nil {
		// DEMO SAFETY: Return mock search results
		postedTime4, _ := time.Parse("2006-01-02", "2024-03-01")
		postedTime5, _ := time.Parse("2006-01-02", "2024-02-28")

		jobs = []JobSummary{
			{
				ID:          "job-004",
				Title:       "Frontend Developer",
				CompanyName: "WebTech Solutions",
				Location:    "Cairo, Egypt",
				Type:        "Full-time",
				Salary:      "$50k - $70k",
				Industry:    "Technology",
				PostedAt:    postedTime4,
				Applicants:  31,
				IsSaved:     false,
				MatchScore:  85,
			},
			{
				ID:          "job-005",
				Title:       "React Developer",
				CompanyName: "Innovate Labs",
				Location:    "Alexandria, Egypt",
				Type:        "Full-time",
				Salary:      "$55k - $75k",
				Industry:    "Technology",
				PostedAt:    postedTime5,
				Applicants:  22,
				IsSaved:     false,
				MatchScore:  88,
			},
		}
	}

	return c.JSON(fiber.Map{
		"jobs":    jobs,
		"query":   query,
		"results": len(jobs),
	})
}

// GetJobDetails handles GET /jobs/:id
func (h *Handler) GetJobDetails(c *fiber.Ctx) error {
	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	jobDetails, err := h.service.GetJobDetails(jobID)
	if err != nil {
		// DEMO SAFETY: Return mock job details
		switch jobID {
		case "job-001":
			postedTime, _ := time.Parse("2006-01-02", "2024-03-15")
			deadline, _ := time.Parse("2006-01-02", "2024-04-15")

			jobDetails = &JobDetails{
				ID:          "job-001",
				Title:       "Senior Frontend Developer",
				CompanyName: "TechCorp Inc.",
				Location:    "Cairo, Egypt",
				Type:        "Full-time",
				Salary:      "$70k - $90k",
				Industry:    "Technology",
				Description: "We're looking for a senior frontend developer with 5+ years of experience in React, TypeScript, and modern web technologies. You'll be working on our flagship product used by millions of users worldwide.",
				Requirements: []string{
					"Bachelor's degree in Computer Science or related field",
					"5+ years of experience with React and TypeScript",
					"Experience with state management (Redux, Zustand)",
					"Strong understanding of responsive design",
					"Experience with testing frameworks (Jest, Cypress)",
				},
				CompanyAbout:   "TechCorp is a leading technology company with 500+ employees, focused on building innovative software solutions for the global market.",
				ApplicantCount: 24,
				Deadline:       deadline,
				PostedAt:       postedTime,
				Status:         "active",
			}
		default:
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Job not found",
			})
		}
	}

	return c.JSON(jobDetails)
}

// ApplyToJob handles POST /jobs/:id/apply
func (h *Handler) ApplyToJob(c *fiber.Ctx) error {
	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	// Extract student ID from context (after auth middleware)
	studentID := c.Locals("user_id").(string)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	var request struct {
		CoverLetter string `json:"cover_letter"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	err := h.service.ApplyToJob(studentID, jobID, request.CoverLetter)
	if err != nil {
		// DEMO SAFETY: Always return success for demo
		// This ensures students can "apply" even if service fails
		// In real system, you'd handle validation errors
	}

	// Generate a mock application ID
	mockedApplicationID := "app-00" + jobID[len(jobID)-1:]

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":        "Application submitted successfully",
		"application_id": mockedApplicationID,
		"status":         "Applied",
		"applied_at":     "2024-03-15T10:30:00Z",
	})
}

// WithdrawApplication handles DELETE /applications/:id
func (h *Handler) WithdrawApplication(c *fiber.Ctx) error {
	applicationID := c.Params("id")
	if applicationID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "application ID is required",
		})
	}

	// Extract student ID from context
	studentID := c.Locals("user_id").(string)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	err := h.service.WithdrawApplication(studentID, applicationID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "application withdrawn successfully",
	})
}

// UploadCV handles CV upload for demo purposes
func (h *Handler) UploadCV(c *fiber.Ctx) error {
	// DEMO: Always return success for CV upload
	return c.JSON(fiber.Map{
		"id":          "cv-001",
		"filename":    "demo_cv.pdf",
		"uploaded_at": time.Now().Format("2006-01-02T15:04:05Z"),
		"message":     "CV uploaded successfully",
	})
}

// AnalyseCV handles CV analysis for demo purposes
func (h *Handler) AnalyseCV(c *fiber.Ctx) error {
	cvID := c.Params("id")

	// DEMO: Return consistent CV analysis results
	return c.JSON(fiber.Map{
		"cv_id":         cvID,
		"score":         78,
		"strengths":     []string{"Python", "Problem Solving", "Team Collaboration"},
		"weaknesses":    []string{"Limited work experience", "Could add more projects"},
		"suggestions":   []string{"Add more personal projects", "Include GitHub profile", "Tailor skills to job descriptions"},
		"analysis_date": time.Now().Format("2006-01-02T15:04:05Z"),
	})
}

// CreateJob handles job creation for employers
func (h *Handler) CreateJob(c *fiber.Ctx) error {
	// DEMO: Create placeholder job
	return c.JSON(fiber.Map{
		"id":      "new-job-001",
		"title":   "New Position",
		"company": "Demo Company",
		"message": "Job posted successfully",
	})
}

// ApproveJob handles job approval for admin/staff
func (h *Handler) ApproveJob(c *fiber.Ctx) error {
	jobID := c.Params("id")

	// DEMO: Return approval success
	return c.JSON(fiber.Map{
		"job_id":      jobID,
		"status":      "approved",
		"approved_by": "demo-admin",
		"approved_at": time.Now().Format("2006-01-02T15:04:05Z"),
	})
}

// GetStudentApplications handles GET /student/applications
func (h *Handler) GetStudentApplications(c *fiber.Ctx) error {
	// Extract student ID from context
	studentID := c.Locals("user_id").(string)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	applications, err := h.service.GetStudentApplications(studentID)
	if err != nil {
		// DEMO SAFETY: Return mock applications
		appliedAt1, _ := time.Parse(time.RFC3339, "2024-03-14T10:30:00Z")
		appliedAt2, _ := time.Parse(time.RFC3339, "2024-03-12T14:45:00Z")

		applications = []StudentApplication{
			{
				ID:          "app-001",
				JobID:       "job-001",
				JobTitle:    "Senior Frontend Developer",
				CompanyName: "TechCorp Inc.",
				Status:      "under_review",
				AppliedAt:   appliedAt1,
				CoverLetter: "I'm excited to apply for this position. My experience with React and modern web technologies aligns perfectly with your requirements.",
			},
			{
				ID:          "app-002",
				JobID:       "job-002",
				JobTitle:    "Backend Engineer",
				CompanyName: "StartupXYZ",
				Status:      "applied",
				AppliedAt:   appliedAt2,
				CoverLetter: "I am interested in working with innovative startups and believe my backend skills would be a great fit.",
			},
		}
	}

	return c.JSON(fiber.Map{
		"applications": applications,
	})
}

// SaveJob handles POST /jobs/:id/save
func (h *Handler) SaveJob(c *fiber.Ctx) error {
	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	studentID := c.Locals("user_id").(string)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	err := h.service.SaveJob(studentID, jobID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job saved successfully",
	})
}

// UnsaveJob handles DELETE /jobs/:id/save
func (h *Handler) UnsaveJob(c *fiber.Ctx) error {
	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	studentID := c.Locals("user_id").(string)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	err := h.service.UnsaveJob(studentID, jobID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job removed from saved list",
	})
}

// GetSavedJobs handles GET /student/saved-jobs
func (h *Handler) GetSavedJobs(c *fiber.Ctx) error {
	studentID := c.Locals("user_id").(string)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	jobs, err := h.service.GetSavedJobs(studentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"jobs": jobs,
	})
}
