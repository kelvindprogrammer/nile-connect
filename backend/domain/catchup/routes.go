package catchup

import "github.com/gofiber/fiber/v2"

func SetupRoutes(app *fiber.App, handler *Handler, authMiddleware fiber.Handler) {
	// Public feed
	app.Get("/feed", handler.GetFeed)

	// Authenticated actions
	g := app.Group("/feed", authMiddleware)
	g.Post("/", handler.CreatePost)
	g.Post("/:id/like", handler.LikePost)
	g.Delete("/:id", handler.DeletePost)
}
