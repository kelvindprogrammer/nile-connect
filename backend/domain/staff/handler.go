package staff

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/response"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
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
	profile, err := h.svc.GetProfile(id)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, profile)
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	stats, err := h.svc.GetDashboardStats()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, stats)
}

func (h *Handler) GetApplications(c *fiber.Ctx) error {
	apps, err := h.svc.GetAllApplications()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, apps)
}

func (h *Handler) GetJobs(c *fiber.Ctx) error {
	jobs, err := h.svc.GetAllJobs()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, jobs)
}

func (h *Handler) UpdateJobStatus(c *fiber.Ctx) error {
	jobID := c.Params("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := h.svc.UpdateJobStatus(jobID, req.Status); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "job status updated"})
}

func (h *Handler) GetEmployers(c *fiber.Ctx) error {
	employers, err := h.svc.GetAllEmployers()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, employers)
}

func (h *Handler) UpdateEmployerStatus(c *fiber.Ctx) error {
	profileID := c.Params("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := h.svc.UpdateEmployerStatus(profileID, req.Status); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "employer status updated"})
}

func (h *Handler) GetStudents(c *fiber.Ctx) error {
	students, err := h.svc.GetAllStudents()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, students)
}
