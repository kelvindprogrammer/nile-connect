package auth

import (
	"errors"
	"strings"

	"github.com/nile-connect/backend/internal/database"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo     AuthRepository
	tokenSvc *TokenService
}

func NewService(repo AuthRepository, tokenSvc *TokenService) *Service {
	return &Service{repo: repo, tokenSvc: tokenSvc}
}

func (s *Service) Login(email, password string) (*AuthResponse, error) {
	user, err := s.repo.FindUserByEmail(email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Employers must be approved before they can log in
	if user.Role == database.RoleEmployer {
		repo, ok := s.repo.(*Repository)
		if ok {
			var profile database.EmployerProfile
			if err := repo.db.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
				return nil, errors.New("employer profile not found")
			}
			if profile.Status != database.EmployerStatusApproved {
				return nil, errors.New("your account is pending verification by staff")
			}
		}
	}

	return s.generateAuthResponse(user)
}

func (s *Service) StudentRegistration(req *RegisterRequest) (*AuthResponse, error) {
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
		IsVerified:   false,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
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

	repo, ok := s.repo.(*Repository)
	if !ok {
		return nil, errors.New("internal error")
	}
	if err := repo.CreateEmployerProfile(profile); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(user)
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

	major := user.Major
	gradYear := user.GraduationYear

	return &AuthResponse{
		User: &User{
			ID:             user.ID,
			FullName:       user.FullName,
			Username:       user.Username,
			Email:          user.Email,
			Role:           string(user.Role),
			StudentSubtype: studentSubtype,
			Major:          &major,
			GraduationYear: &gradYear,
			IsVerified:     user.IsVerified,
		},
		Token: token,
	}, nil
}

func isEduEmail(email string) bool {
	return strings.HasSuffix(strings.ToLower(email), ".edu") ||
		strings.HasSuffix(strings.ToLower(email), ".edu.ng")
}
