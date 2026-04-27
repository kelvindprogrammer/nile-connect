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

// ForgotPassword handles forgot-password requests
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil || req.Email == "" {
		return response.BadRequest(c, "Email is required")
	}

	token, err := h.svc.ForgotPassword(req.Email)
	if err != nil {
		// Don't leak whether email exists
		return response.OK(c, fiber.Map{"message": "If that email is registered, a reset link has been sent."})
	}

	// In production, send via email. For demo, return token in response.
	return response.OK(c, fiber.Map{
		"message": "Reset token generated. Check your email.",
		"token":   token, // Remove in production
	})
}

// ResetPassword handles the actual password reset
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request")
	}
	if req.Token == "" || req.NewPassword == "" {
		return response.BadRequest(c, "Token and new_password are required")
	}
	if len(req.NewPassword) < 8 {
		return response.BadRequest(c, "Password must be at least 8 characters")
	}

	if err := h.svc.ResetPassword(req.Token, req.NewPassword); err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "Password reset successfully"})
}

// Health check endpoint
func (h *Handler) Health(c *fiber.Ctx) error {
	return response.OK(c, map[string]string{"status": "healthy"})
}
