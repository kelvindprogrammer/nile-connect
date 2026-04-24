package catchup

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

func (h *Handler) GetFeed(c *fiber.Ctx) error {
	posts, err := h.svc.GetFeed()
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, posts)
}

func (h *Handler) CreatePost(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	var req CreatePostRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	post, err := h.svc.CreatePost(id, userRole(c), req.Content, req.MediaUrl)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.Created(c, post)
}

func (h *Handler) LikePost(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	if err := h.svc.LikePost(c.Params("id"), id); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "liked"})
}

func (h *Handler) DeletePost(c *fiber.Ctx) error {
	id := userID(c)
	if id == "" {
		return response.Unauthorized(c)
	}
	if err := h.svc.DeletePost(c.Params("id"), id); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "deleted"})
}
