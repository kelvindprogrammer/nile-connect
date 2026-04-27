package messages

import "github.com/gofiber/fiber/v2"

func SetupRoutes(app *fiber.App, h *Handler, auth fiber.Handler) {
	// Messaging
	msg := app.Group("/messages", auth)
	msg.Get("/conversations", h.GetConversations)
	msg.Get("/thread/:toUserID", h.GetThread)
	msg.Post("/send/:toUserID", h.Send)

	// User search (used by Network page)
	app.Get("/users/search", auth, h.SearchUsers)
}
