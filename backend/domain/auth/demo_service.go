package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/nile-connect/backend/internal/config"
	"github.com/nile-connect/backend/internal/database"
)

// DemoService provides demo functionality without database dependencies
type DemoService struct {
	tokenSvc *TokenService
	demoUsers map[string]*User
}

func NewDemoService(cfg *config.Config) *DemoService {
	tokenSvc := NewTokenService(cfg)
	
	// Initialize demo users
	demoUsers := map[string]*User{
		"student@demo.edu": {
			ID:             "demo-student-001",
			FullName:       "Demo Student",
			Username:       "demo_student",
			Email:          "student@demo.edu",
			Role:           "student",
			StudentSubtype: stringPtr("current"),
			Major:          stringPtr("Computer Science"),
			GraduationYear: intPtr(2025),
			IsVerified:     true,
		},
		"employer@demo.com": {
			ID:         "demo-employer-001",
			FullName:   "Demo Employer",
			Username:   "demo_employer",
			Email:      "employer@demo.com",
			Role:       "employer",
			IsVerified: true,
		},
		"staff@demo.edu": {
			ID:         "demo-staff-001",
			FullName:   "Demo Staff",
			Username:   "demo_staff", 
			Email:      "staff@demo.edu",
			Role:       "staff",
			IsVerified: true,
		},
	}
	
	return &DemoService{
		tokenSvc: tokenSvc,
		demoUsers: demoUsers,
	}
}

func (s *DemoService) Login(email, password string) (*AuthResponse, error) {
	// DEMO MODE: Always succeed for demo accounts with password "demo123"
	if user, exists := s.demoUsers[email]; exists {
		if password == "demo123" {
			token, err := s.generateTokenForUser(user)
			if err != nil {
				return nil, err
			}
			return &AuthResponse{
				User:  user,
				Token: token,
			}, nil
		}
	}
	
	return nil, errors.New("invalid credentials")
}

func (s *DemoService) StudentRegistration(req *RegisterRequest) (*AuthResponse, error) {
	// DEMO MODE: Always succeed - create new demo user
	user := &User{
		ID:         "generated-" + fmt.Sprintf("%d", time.Now().Unix()),
		FullName:   req.FullName,
		Username:   req.Username,
		Email:      req.Email,
		Role:       "student",
		StudentSubtype: stringPtr("current"),
		IsVerified: true,
	}
	
	token, err := s.generateTokenForUser(user)
	if err != nil {
		return nil, err
	}
	
	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

func (s *DemoService) EmployerRegistration(req *EmployerRegisterRequest) (*AuthResponse, error) {
	// DEMO MODE: Always succeed - create new demo employer
	user := &User{
		ID:         "generated-" + fmt.Sprintf("%d", time.Now().Unix()),
		FullName:   req.FullName,
		Username:   req.Username,
		Email:      req.Email,
		Role:       "employer",
		IsVerified: true,
	}
	
	token, err := s.generateTokenForUser(user)
	if err != nil {
		return nil, err
	}
	
	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

func (s *DemoService) CompleteStudentProfile(req *ProfileCompletionRequest) (*AuthResponse, error) {
	// DEMO MODE: Update user profile and return success
	user := &User{
		ID:             req.UserID,
		Major:          &req.Major,
		GraduationYear: &req.GraduationYear,
		IsVerified:     true,
		Role:           "student",
		StudentSubtype: stringPtr("current"),
	}
	
	token, err := s.generateTokenForUser(user)
	if err != nil {
		return nil, err
	}
	
	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

func (s *DemoService) generateTokenForUser(user *User) (string, error) {
	// Convert User to database.User for token generation
	dbUser := &database.User{
		ID:         user.ID,
		FullName:   user.FullName,
		Username:   user.Username,
		Email:      user.Email,
		Role:       stringToRole(user.Role),
		IsVerified: user.IsVerified,
	}
	
	if user.Major != nil {
		dbUser.Major = *user.Major
	}
	if user.GraduationYear != nil {
		dbUser.GraduationYear = *user.GraduationYear
	}
	if user.StudentSubtype != nil {
		studentSubtype := database.StudentSubtype(*user.StudentSubtype)
		dbUser.StudentSubtype = &studentSubtype
	}
	
	return s.tokenSvc.GenerateToken(dbUser)
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func stringToRole(role string) database.Role {
	switch role {
	case "student":
		return database.RoleStudent
	case "employer":
		return database.RoleEmployer
	case "staff":
		return database.RoleStaff
	default:
		return database.RoleStudent
	}
}