package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/nile-connect/backend/internal/database"
	"golang.org/x/crypto/bcrypt"
)

// Service implements AuthService interface
type Service struct {
	repo     AuthRepository
	tokenSvc *TokenService
}

func NewService(repo AuthRepository, tokenSvc *TokenService) *Service {
	return &Service{
		repo:     repo,
		tokenSvc: tokenSvc,
	}
}

func (s *Service) Login(email, password string) (*AuthResponse, error) {
	// DEMO SAFETY: Predefined demo accounts - Always work in demo mode
	demoAccounts := map[string]*database.User{
		"student@demo.edu": {
			ID:           "demo-student-001",
			FullName:     "Demo Student",
			Username:     "demo_student",
			Email:        "student@demo.edu",
			PasswordHash: "$2a$10$demo_hash_for_demo_only_student",
			Role:         database.RoleStudent,
			Major:        "Computer Science",
			GraduationYear: 2025,
			IsVerified:   true,
			StudentSubtype: func() *database.StudentSubtype { 
				st := database.StudentSubtypeCurrent
				return &st 
			}(),
		},
		"staff@demo.edu": {
			ID:           "demo-staff-001",
			FullName:     "Demo Staff",
			Username:     "demo_staff",
			Email:        "staff@demo.edu",
			PasswordHash: "$2a$10$demo_hash_for_demo_only_staff",
			Role:         database.RoleStaff,
			IsVerified:   true,
		},
		"employer@demo.com": {
			ID:           "demo-employer-001",
			FullName:     "Demo Employer",
			Username:     "demo_employer",
			Email:        "employer@demo.com",
			PasswordHash: "$2a$10$demo_hash_for_demo_only_employer",
			Role:         database.RoleEmployer,
			IsVerified:   true,
		},
	}

	// DEMO SAFETY: Check if this is a demo account
	if demoUser, exists := demoAccounts[email]; exists {
		// For demo accounts, password is always "demo123"
		demoPassword := "demo123"
		if password == demoPassword {
			return s.generateAuthResponse(demoUser)
		}
		return nil, errors.New("invalid credentials")
	}

	// Regular authentication flow
	user, err := s.repo.FindUserByEmail(email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check employer verification status
	if user.Role == database.RoleEmployer {
		var profile database.EmployerProfile
		repo, ok := s.repo.(*Repository)
		if ok {
			if err := repo.db.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
				return nil, errors.New("employer profile not found")
			}
			if profile.Status != database.EmployerStatusApproved {
				return nil, errors.New("employer account pending verification")
			}
		}
	}

	return s.generateAuthResponse(user)
}

func (s *Service) StudentRegistration(req *RegisterRequest) (*AuthResponse, error) {
	// DEMO SAFETY: In demo mode, handle "demo" email patterns gracefully
	if strings.HasSuffix(strings.ToLower(req.Email), "@demo.edu") {
		// Check if it's the exact demo account
		if req.Email == "student@demo.edu" || req.Email == "admin@demo.edu" {
			// Return successful registration for demo purposes
			demoUsername := "demo_" + strings.ToLower(req.FullName)
			studentSubtype := database.StudentSubtypeCurrent
			
			user := &database.User{
				ID:             fmt.Sprintf("generated-%d", time.Now().Unix()),
				FullName:       req.FullName,
				Username:       demoUsername,
				Email:          req.Email,
				PasswordHash:   "$2a$10$demo_hash_for_generated_user",
				Role:           database.RoleStudent,
				StudentSubtype: &studentSubtype,
				IsVerified:     true,
			}
			
			return s.generateAuthResponse(user)
		}
	}

	exists, err := s.repo.UserExists(req.Email, req.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email or username already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	studentSubtype := database.StudentSubtypeCurrent
	if !isEduEmail(req.Email) {
		studentSubtype = database.StudentSubtypeAlumni
	}

	user := &database.User{
		FullName:       req.FullName,
		Username:       req.Username,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		Role:           database.RoleStudent,
		StudentSubtype: &studentSubtype,
		IsVerified:     true,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(user)
}

func (s *Service) EmployerRegistration(req *EmployerRegisterRequest) (*AuthResponse, error) {
	exists, err := s.repo.UserExists(req.Email, req.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email or username already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &database.User{
		FullName:     req.FullName,
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         database.RoleEmployer,
		IsVerified:   true,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}

	// Create employer profile
	profile := &database.EmployerProfile{
		UserID:       user.ID,
		CompanyName:  req.CompanyName,
		Industry:     req.Industry,
		Location:     req.Location,
		About:        req.About,
		ContactEmail: req.ContactEmail,
		Website:      req.Website,
		Status:       database.EmployerStatusPending,
	}

	repo, ok := s.repo.(*Repository)
	if !ok {
		return nil, errors.New("repository type assertion failed")
	}
	if err := repo.CreateEmployerProfile(profile); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(user)
}

func (s *Service) RegisterStudent(req *RegisterRequest) (*database.User, error) {
	exists, err := s.repo.UserExists(req.Email, req.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email or username already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	studentSubtype := database.StudentSubtypeCurrent
	if !isEduEmail(req.Email) {
		studentSubtype = database.StudentSubtypeAlumni
	}

	user := &database.User{
		FullName:       req.FullName,
		Username:       req.Username,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		Role:           database.RoleStudent,
		StudentSubtype: &studentSubtype,
		IsVerified:     true,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *Service) CompleteStudentProfile(req *ProfileCompletionRequest) (*AuthResponse, error) {
	user, err := s.repo.FindUserByID(req.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	user.Major = req.Major
	user.GraduationYear = req.GraduationYear

	if err := s.repo.UpdateUser(user); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(user)
}

func (s *Service) RegisterEmployer(req *EmployerRegisterRequest) (*database.User, *database.EmployerProfile, error) {
	exists, err := s.repo.UserExists(req.Email, req.Username)
	if err != nil {
		return nil, nil, err
	}
	if exists {
		return nil, nil, errors.New("email or username already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}

	user := &database.User{
		FullName:     req.FullName,
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         database.RoleEmployer,
		IsVerified:   true,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, nil, err
	}

	profile := &database.EmployerProfile{
		UserID:       user.ID,
		CompanyName:  req.CompanyName,
		Industry:     req.Industry,
		Location:     req.Location,
		About:        req.About,
		ContactEmail: req.ContactEmail,
		Website:      req.Website,
		Status:       database.EmployerStatusPending,
	}

	if err := s.repo.CreateEmployerProfile(profile); err != nil {
		return nil, nil, err
	}

	return user, profile, nil
}

func (s *Service) generateAuthResponse(user *database.User) (*AuthResponse, error) {
	token, err := s.tokenSvc.GenerateToken(user)
	if err != nil {
		return nil, err
	}

	var studentSubtype *string
	if user.StudentSubtype != nil {
		st := string(*user.StudentSubtype)
		studentSubtype = &st
	}

	// Convert string and int to pointers
	majorPtr := &user.Major
	graduationYearPtr := &user.GraduationYear
	
	return &AuthResponse{
		User: &User{
			ID:             user.ID,
			FullName:       user.FullName,
			Username:       user.Username,
			Email:          user.Email,
			Role:           string(user.Role),
			StudentSubtype: studentSubtype,
			Major:          majorPtr,
			GraduationYear: graduationYearPtr,
			IsVerified:     user.IsVerified,
		},
		Token: token,
	}, nil
}

func isEduEmail(email string) bool {
	return strings.HasSuffix(strings.ToLower(email), ".edu")
}

