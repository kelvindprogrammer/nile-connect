package staff

import "errors"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetDashboardStats() (*DashboardStats, error) {
	return s.repo.GetStats()
}

func (s *Service) GetAllApplications() ([]ApplicationSummary, error) {
	return s.repo.GetAllApplications()
}

func (s *Service) GetAllJobs() ([]JobSummary, error) {
	return s.repo.GetAllJobs()
}

func (s *Service) UpdateJobStatus(jobID, status string) error {
	allowed := map[string]bool{"active": true, "pending": true, "rejected": true, "archived": true}
	if !allowed[status] {
		return errors.New("invalid status value")
	}
	return s.repo.UpdateJobStatus(jobID, status)
}

func (s *Service) GetAllEmployers() ([]EmployerSummary, error) {
	return s.repo.GetAllEmployers()
}

func (s *Service) UpdateEmployerStatus(profileID, status string) error {
	allowed := map[string]bool{"approved": true, "pending": true, "rejected": true}
	if !allowed[status] {
		return errors.New("invalid status value")
	}
	return s.repo.UpdateEmployerStatus(profileID, status)
}

func (s *Service) GetAllStudents() ([]StudentSummary, error) {
	return s.repo.GetAllStudents()
}

func (s *Service) GetProfile(staffID string) (*StaffProfile, error) {
	user, err := s.repo.FindStaffByID(staffID)
	if err != nil {
		return nil, errors.New("staff profile not found")
	}
	return &StaffProfile{
		ID:       user.ID,
		FullName: user.FullName,
		Username: user.Username,
		Email:    user.Email,
		Role:     string(user.Role),
	}, nil
}
