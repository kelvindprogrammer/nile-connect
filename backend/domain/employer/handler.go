package employer

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/response"
)

type Handler struct {
	service EmployerService
}

func NewHandler(service EmployerService) *Handler {
	return &Handler{service: service}
}

func userID(c *fiber.Ctx) string {
	id, _ := c.Locals("userID").(string)
	return id
}

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	profile, err := h.service.GetProfile(id)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, profile)
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req ProfileUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	profile, err := h.service.UpdateProfile(id, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, profile)
}

func (h *Handler) PostJob(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req JobPostRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	job, err := h.service.PostJob(id, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.Created(c, job)
}

func (h *Handler) GetEmployerJobs(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	jobs, err := h.service.GetEmployerJobs(id)
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, jobs)
}

func (h *Handler) UpdateJob(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	jobID := c.Params("id")
	if jobID == "" {
		return response.BadRequest(c, "job ID is required")
	}
	var req UpdateJobRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	job, err := h.service.UpdateJob(id, jobID, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, job)
}

func (h *Handler) DeleteJob(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	jobID := c.Params("id")
	if jobID == "" {
		return response.BadRequest(c, "job ID is required")
	}
	if err := h.service.DeleteJob(id, jobID); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "job deleted"})
}

func (h *Handler) GetJobApplications(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	jobID := c.Params("id")
	if jobID == "" {
		return response.BadRequest(c, "job ID is required")
	}
	applications, err := h.service.GetJobApplications(id, jobID)
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, applications)
}

func (h *Handler) UpdateApplicationStatus(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	applicationID := c.Params("id")
	if applicationID == "" {
		return response.BadRequest(c, "application ID is required")
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	app, err := h.service.UpdateApplicationStatus(id, applicationID, req.Status)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, app)
}
