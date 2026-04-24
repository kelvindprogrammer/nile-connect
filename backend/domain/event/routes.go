package event

import "github.com/gofiber/fiber/v2"

func SetupRoutes(app *fiber.App, handler *Handler, authMiddleware fiber.Handler) {
	// Public: list and view events
	app.Get("/events", handler.ListEvents)
	app.Get("/events/:id", handler.GetEvent)

	// Authenticated: create, update, delete, register
	g := app.Group("/events", authMiddleware)
	g.Post("/", handler.CreateEvent)
	g.Put("/:id", handler.UpdateEvent)
	g.Delete("/:id", handler.DeleteEvent)
	g.Post("/:id/register", handler.RegisterForEvent)
}
