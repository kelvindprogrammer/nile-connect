package auth

import (
	"errors"

	"github.com/nile-connect/backend/internal/config"
)

// DemoService is a no-database fallback used when the DB is unavailable.
// It always returns an error so callers know to fix their configuration.
type DemoService struct{}

func NewDemoService(_ *config.Config) *DemoService {
	return &DemoService{}
}

func (s *DemoService) Login(_, _ string) (*AuthResponse, error) {
	return nil, errors.New("service unavailable: database not configured")
}

func (s *DemoService) StudentRegistration(_ *RegisterRequest) (*AuthResponse, error) {
	return nil, errors.New("service unavailable: database not configured")
}

func (s *DemoService) EmployerRegistration(_ *EmployerRegisterRequest) (*AuthResponse, error) {
	return nil, errors.New("service unavailable: database not configured")
}

func (s *DemoService) CompleteStudentProfile(_ *ProfileCompletionRequest) (*AuthResponse, error) {
	return nil, errors.New("service unavailable: database not configured")
}
