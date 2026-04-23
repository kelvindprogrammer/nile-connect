package auth

type LoginRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
	StudentID string `json:"student_id,omitempty"` // For alumni login
}