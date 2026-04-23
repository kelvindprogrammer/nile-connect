package auth

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nile-connect/backend/internal/response"
)

// Handler handles HTTP requests for authentication
type Handler struct {
	svc AuthService
}

func NewHandler(svc AuthService) *Handler {
	return &Handler{svc: svc}
}

// Login handles login requests
func (h *Handler) Login(c *fiber.Ctx) error {
	var req AuthRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	// Basic validation
	if req.Email == "" || req.Password == "" {
		return response.BadRequest(c, "Email and password are required")
	}

	resp, err := h.svc.Login(req.Email, req.Password)
	if err != nil {
		return response.Unauthorized(c, err.Error())
	}

	return response.OK(c, resp)
}

// StudentRegistration handles student registration
func (h *Handler) StudentRegistration(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	// Basic validation
	if req.FullName == "" || req.Username == "" || req.Email == "" || req.Password == "" {
		return response.BadRequest(c, "All fields are required")
	}

	resp, err := h.svc.StudentRegistration(&req)
	if err != nil {
		if err.Error() == "email or username already exists" {
			return response.Conflict(c, err.Error())
		}
		return response.BadRequest(c, err.Error())
	}

	return response.Created(c, resp)
}

// EmployerRegistration handles employer registration
func (h *Handler) EmployerRegistration(c *fiber.Ctx) error {
	var req EmployerRegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	// Basic validation
	if req.FullName == "" || req.Username == "" || req.Email == "" || req.Password == "" ||
		req.CompanyName == "" || req.Industry == "" || req.Location == "" || req.About == "" || req.ContactEmail == "" {
		return response.BadRequest(c, "All required fields must be filled")
	}

	resp, err := h.svc.EmployerRegistration(&req)
	if err != nil {
		if err.Error() == "email or username already exists" {
			return response.Conflict(c, err.Error())
		}
		return response.BadRequest(c, err.Error())
	}

	return response.Created(c, resp)
}

// CompleteStudentProfile handles student profile completion
func (h *Handler) CompleteStudentProfile(c *fiber.Ctx) error {
	var req ProfileCompletionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request format")
	}

	if req.UserID == "" || req.Major == "" || req.GraduationYear == 0 {
		return response.BadRequest(c, "All fields are required")
	}

	resp, err := h.svc.CompleteStudentProfile(&req)
	if err != nil {
		if err.Error() == "user not found" {
			return response.NotFound(c, err.Error())
		}
		return response.BadRequest(c, err.Error())
	}

	return response.OK(c, resp)
}

// Health check endpoint
func (h *Handler) Health(c *fiber.Ctx) error {
	return response.OK(c, map[string]string{"status": "healthy"})
}
