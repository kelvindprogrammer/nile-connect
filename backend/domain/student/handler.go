package student

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/response"
)

// Handler handles HTTP requests for student operations
type Handler struct {
	svc StudentService
}

func NewHandler(svc StudentService) *Handler {
	return &Handler{svc: svc}
}

// GetProfile handles fetching student profile
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	profile, err := h.svc.GetProfile(userID)
	if err != nil {
		return response.NotFound(c, err.Error())
	}

	return response.OK(c, profile)
}

// UpdateProfile handles updating student profile
func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req ProfileUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	updatedProfile, err := h.svc.UpdateProfile(userID, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.OK(c, updatedProfile)
}

// UploadCV handles CV upload
func (h *Handler) UploadCV(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req CVUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	if req.Filename == "" || len(req.Content) == 0 {
		return response.BadRequest(c, "Filename and content are required")
	}

	resp, err := h.svc.UploadCV(userID, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.Created(c, resp)
}

// GetCV handles fetching specific CV
func (h *Handler) GetCV(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	cvID := c.Params("cvID")

	resp, err := h.svc.GetCV(userID, cvID)
	if err != nil {
		return response.NotFound(c, err.Error())
	}

	return response.OK(c, resp)
}

// DeleteCV handles CV deletion
func (h *Handler) DeleteCV(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	cvID := c.Params("cvID")

	err := h.svc.DeleteCV(userID, cvID)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.OK(c, map[string]string{"message": "CV deleted successfully"})
}

// ApplyToJob handles job application
func (h *Handler) ApplyToJob(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req JobApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	if req.JobID == "" {
		return response.BadRequest(c, "Job ID is required")
	}

	resp, err := h.svc.ApplyToJob(userID, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.Created(c, resp)
}

// GetApplications handles fetching user's job applications
func (h *Handler) GetApplications(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	applications, err := h.svc.GetApplications(userID)
	if err != nil {
		return response.NotFound(c, err.Error())
	}

	return response.OK(c, applications)
}

// SearchJobs handles job search
func (h *Handler) SearchJobs(c *fiber.Ctx) error {
	query := c.Query("q")
	filters := map[string]interface{}{
		"industry": c.Query("industry"),
		"location": c.Query("location"),
		"type":     c.Query("type"),
	}

	// Remove empty filters
	for key, value := range filters {
		if value == "" {
			delete(filters, key)
		}
	}

	jobs, err := h.svc.SearchJobs(query, filters)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.OK(c, jobs)
}

// Health check endpoint
func (h *Handler) Health(c *fiber.Ctx) error {
	return response.OK(c, map[string]string{"status": "healthy"})
}
