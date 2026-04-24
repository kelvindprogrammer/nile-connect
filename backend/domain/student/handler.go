package student

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/response"
)

type Handler struct {
	svc StudentService
}

func NewHandler(svc StudentService) *Handler {
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

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req ProfileUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request format")
	}
	updated, err := h.svc.UpdateProfile(id, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, updated)
}

func (h *Handler) UploadCV(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req CVUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request format")
	}
	if req.Filename == "" || len(req.Content) == 0 {
		return response.BadRequest(c, "filename and content are required")
	}
	resp, err := h.svc.UploadCV(id, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.Created(c, resp)
}

func (h *Handler) GetCV(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	resp, err := h.svc.GetCV(id, c.Params("cvID"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, resp)
}

func (h *Handler) DeleteCV(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	if err := h.svc.DeleteCV(id, c.Params("cvID")); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "CV deleted"})
}

func (h *Handler) ApplyToJob(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req JobApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request format")
	}
	if req.JobID == "" {
		return response.BadRequest(c, "job ID is required")
	}
	resp, err := h.svc.ApplyToJob(id, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.Created(c, resp)
}

func (h *Handler) GetApplications(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	apps, err := h.svc.GetApplications(id)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, apps)
}

func (h *Handler) SearchJobs(c *fiber.Ctx) error {
	query := c.Query("q")
	filters := map[string]interface{}{}
	if v := c.Query("industry"); v != "" {
		filters["industry"] = v
	}
	if v := c.Query("location"); v != "" {
		filters["location"] = v
	}
	if v := c.Query("type"); v != "" {
		filters["type"] = v
	}
	jobs, err := h.svc.SearchJobs(query, filters)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, jobs)
}

func (h *Handler) Health(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"status": "healthy"})
}
