package employer

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// Module represents the complete employer domain module
type Module struct {
	Repo    EmployerRepository
	Service EmployerService
	Handler *Handler
}

// NewModule creates and initializes the employer domain module
func NewModule(db *gorm.DB, app *fiber.App, authMiddleware fiber.Handler) *Module {
	// Create repository
	repo := NewRepository(db)
	
	// Create service
	service := NewService(repo)
	
	// Create handler
	handler := NewHandler(service)
	
	// Create module
	module := &Module{
		Repo:    repo,
		Service: service,
		Handler: handler,
	}
	
	// Register routes with Fiber
	Routes(app, handler, authMiddleware)
	
	return module
}