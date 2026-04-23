package auth

import (
	

	"github.com/nile-connect/backend/internal/database"
)

type AuthRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type AuthResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

type User struct {
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	StudentSubtype *string `json:"student_subtype,omitempty"`
	Major          *string `json:"major,omitempty"`
	GraduationYear *int    `json:"graduation_year,omitempty"`
	IsVerified     bool    `json:"is_verified"`
}

type RegisterRequest struct {
	FullName string `json:"full_name" validate:"required,min=2"`
	Username string `json:"username" validate:"required,min=3,max=20"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type ProfileCompletionRequest struct {
	UserID         string `json:"user_id" validate:"required"`
	Major          string `json:"major" validate:"required"`
	GraduationYear int    `json:"graduation_year" validate:"required,min=2023,max=2030"`
}

type EmployerRegisterRequest struct {
	FullName     string `json:"full_name" validate:"required,min=2"`
	Username     string `json:"username" validate:"required,min=3,max=20"`
	Email        string `json:"email" validate:"required,email"`
	Password     string `json:"password" validate:"required,min=8"`
	CompanyName  string `json:"company_name" validate:"required"`
	Industry     string `json:"industry" validate:"required"`
	Location     string `json:"location" validate:"required"`
	About        string `json:"about" validate:"required,min=10"`
	ContactEmail string `json:"contact_email" validate:"required,email"`
	Website      string `json:"website" validate:"omitempty,url"`
}

// Service interface
type AuthService interface {
	Login(email, password string) (*AuthResponse, error)
	StudentRegistration(req *RegisterRequest) (*AuthResponse, error)
	EmployerRegistration(req *EmployerRegisterRequest) (*AuthResponse, error)
	CompleteStudentProfile(req *ProfileCompletionRequest) (*AuthResponse, error)
}

// Repository interface
type AuthRepository interface {
	FindUserByEmail(email string) (*database.User, error)
	FindUserByUsername(username string) (*database.User, error)
	FindUserByID(id string) (*database.User, error)
	CreateUser(user *database.User) error
	CreateEmployerProfile(profile *database.EmployerProfile) error
	UpdateUser(user *database.User) error
	UserExists(email, username string) (bool, error)
}