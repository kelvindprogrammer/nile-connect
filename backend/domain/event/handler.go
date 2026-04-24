package event

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

func userRole(c *fiber.Ctx) string {
	role, _ := c.Locals("role").(string)
	return role
}

func (h *Handler) ListEvents(c *fiber.Ctx) error {
	events, err := h.svc.ListEvents()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, events)
}

func (h *Handler) GetEvent(c *fiber.Ctx) error {
	ev, err := h.svc.GetEvent(c.Params("id"))
	if err != nil {
		return response.NotFound(c, "event not found")
	}
	return response.OK(c, ev)
}

func (h *Handler) CreateEvent(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	role := userRole(c)
	if role != "staff" && role != "employer" {
		return response.Forbidden(c)
	}
	var req CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	ev, err := h.svc.CreateEvent(id, role, &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.Created(c, ev)
}

func (h *Handler) UpdateEvent(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	ev, err := h.svc.UpdateEvent(c.Params("id"), &req)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, ev)
}

func (h *Handler) DeleteEvent(c *fiber.Ctx) error {
	if userID(c) == "" {
		return response.Unauthorized(c)
	}
	if err := h.svc.DeleteEvent(c.Params("id")); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "event deleted"})
}

func (h *Handler) RegisterForEvent(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	if err := h.svc.RegisterForEvent(c.Params("id"), id); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "registered successfully"})
}
