package employer

import (
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for employer domain
type Handler struct {
	service EmployerService
}

// NewHandler creates a new employer handler
func NewHandler(service EmployerService) *Handler {
	return &Handler{service: service}
}

// GetProfile handles GET /employer/profile
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	// Extract employer ID from context (after auth middleware)
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	profile, err := h.service.GetProfile(employerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(profile)
}

// UpdateProfile handles PUT /employer/profile
func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	var request ProfileUpdateRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	profile, err := h.service.UpdateProfile(employerID, &request)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(profile)
}

// PostJob handles POST /employer/jobs
func (h *Handler) PostJob(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	var request JobPostRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	job, err := h.service.PostJob(employerID, &request)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(job)
}

// GetEmployerJobs handles GET /employer/jobs
func (h *Handler) GetEmployerJobs(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	jobs, err := h.service.GetEmployerJobs(employerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"jobs": jobs,
	})
}

// UpdateJob handles PUT /employer/jobs/:id
func (h *Handler) UpdateJob(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	var request UpdateJobRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	job, err := h.service.UpdateJob(employerID, jobID, &request)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(job)
}

// DeleteJob handles DELETE /employer/jobs/:id
func (h *Handler) DeleteJob(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	err := h.service.DeleteJob(employerID, jobID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job deleted successfully",
	})
}

// GetJobApplications handles GET /employer/jobs/:id/applications
func (h *Handler) GetJobApplications(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	jobID := c.Params("id")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "job ID is required",
		})
	}

	applications, err := h.service.GetJobApplications(employerID, jobID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"applications": applications,
	})
}

// UpdateApplicationStatus handles PUT /employer/applications/:id/status
func (h *Handler) UpdateApplicationStatus(c *fiber.Ctx) error {
	// Extract employer ID from context
	employerID := c.Locals("user_id").(string)
	if employerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "authentication required",
		})
	}

	applicationID := c.Params("id")
	if applicationID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "application ID is required",
		})
	}

	var request struct {
		Status string `json:"status"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	application, err := h.service.UpdateApplicationStatus(employerID, applicationID, request.Status)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(application)
}