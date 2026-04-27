package messages

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/response"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func userID(c *fiber.Ctx) string {
	id, _ := c.Locals("userID").(string)
	return id
}

// POST /messages/:toUserID — send a message
func (h *Handler) Send(c *fiber.Ctx) error {
	from := userID(c)
	if from == "" {
		return response.Unauthorized(c)
	}
	to := c.Params("toUserID")
	if to == "" || to == from {
		return response.BadRequest(c, "invalid recipient")
	}

	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil || req.Content == "" {
		return response.BadRequest(c, "content is required")
	}

	msg, err := h.repo.Send(from, to, req.Content)
	if err != nil {
		return response.InternalError(c)
	}

	return response.Created(c, MessageResponse{
		ID:         msg.ID,
		SenderID:   msg.SenderID,
		ReceiverID: msg.ReceiverID,
		Content:    msg.Content,
		IsRead:     msg.IsRead,
		CreatedAt:  msg.CreatedAt,
	})
}

// GET /messages/thread/:toUserID — message thread between caller and another user
func (h *Handler) GetThread(c *fiber.Ctx) error {
	me := userID(c)
	if me == "" {
		return response.Unauthorized(c)
	}
	other := c.Params("toUserID")
	if other == "" {
		return response.BadRequest(c, "user ID required")
	}

	msgs, err := h.repo.GetThread(me, other, 100)
	if err != nil {
		return response.InternalError(c, "failed to fetch messages")
	}

	// Mark incoming as read
	_ = h.repo.MarkRead(me, other)

	result := make([]MessageResponse, len(msgs))
	for i, m := range msgs {
		result[i] = MessageResponse{
			ID:         m.ID,
			SenderID:   m.SenderID,
			ReceiverID: m.ReceiverID,
			Content:    m.Content,
			IsRead:     m.IsRead,
			CreatedAt:  m.CreatedAt,
		}
	}
	return response.OK(c, fiber.Map{"messages": result})
}

// GET /messages/conversations — list all conversation partners
func (h *Handler) GetConversations(c *fiber.Ctx) error {
	me := userID(c)
	if me == "" {
		return response.Unauthorized(c)
	}

	convs, err := h.repo.GetConversations(me)
	if err != nil {
		return response.InternalError(c, "failed to fetch conversations")
	}

	if convs == nil {
		convs = []ConversationSummary{}
	}
	return response.OK(c, fiber.Map{"conversations": convs})
}

// GET /users/search?q=&role= — search platform users
func (h *Handler) SearchUsers(c *fiber.Ctx) error {
	me := userID(c)
	if me == "" {
		return response.Unauthorized(c)
	}

	q := c.Query("q")
	role := c.Query("role")

	users, err := h.repo.SearchUsers(me, q, role, 50)
	if err != nil {
		return response.InternalError(c, "search failed")
	}
	if users == nil {
		users = []UserProfile{}
	}
	return response.OK(c, fiber.Map{"users": users})
}
