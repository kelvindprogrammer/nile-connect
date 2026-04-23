package student

import (
	"errors"
)

// Service implements StudentService interface
type Service struct {
	repo StudentRepository
}

func NewService(repo StudentRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(userID string) (*Student, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	student, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, errors.New("student profile not found")
	}

	return student, nil
}

func (s *Service) UpdateProfile(userID string, req *ProfileUpdateRequest) (*Student, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	updates := make(map[string]interface{})

	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Major != "" {
		updates["major"] = req.Major
	}
	if req.GraduationYear > 0 {
		updates["graduation_year"] = req.GraduationYear
	}
	if req.GPA > 0 {
		updates["gpa"] = req.GPA
	}
	if req.Skills != nil {
		updates["skills"] = req.Skills
	}
	if req.Interests != nil {
		updates["interests"] = req.Interests
	}

	if len(updates) == 0 {
		return nil, errors.New("no valid fields to update")
	}

	err := s.repo.UpdateProfile(userID, updates)
	if err != nil {
		return nil, errors.New("failed to update profile")
	}

	// Return updated profile
	return s.GetProfile(userID)
}

func (s *Service) UploadCV(userID string, req *CVUploadRequest) (*CVUploadResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	if req.Filename == "" {
		return nil, errors.New("filename is required")
	}

	if len(req.Content) == 0 {
		return nil, errors.New("CV content cannot be empty")
	}

	cvID, err := s.repo.SaveCV(userID, *req)
	if err != nil {
		return nil, errors.New("failed to save CV")
	}

	return &CVUploadResponse{
		CVId:     cvID,
		Filename: req.Filename,
		URL:      "/api/students/" + userID + "/cv/" + cvID,
	}, nil
}

func (s *Service) GetCV(userID string, cvID string) (*CVUploadResponse, error) {
	if userID == "" || cvID == "" {
		return nil, errors.New("user ID and CV ID are required")
	}

	cvData, err := s.repo.GetCV(userID, cvID)
	if err != nil {
		return nil, errors.New("CV not found")
	}

	return &CVUploadResponse{
		CVId:     cvID,
		Filename: cvData.Filename,
		URL:      "/api/students/" + userID + "/cv/" + cvID,
	}, nil
}

func (s *Service) DeleteCV(userID string, cvID string) error {
	if userID == "" || cvID == "" {
		return errors.New("user ID and CV ID are required")
	}

	err := s.repo.DeleteCV(userID, cvID)
	if err != nil {
		return errors.New("failed to delete CV")
	}

	return nil
}

func (s *Service) ApplyToJob(userID string, req *JobApplicationRequest) (*JobApplicationResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	if req.JobID == "" {
		return nil, errors.New("job ID is required")
	}

	applicationID, err := s.repo.CreateJobApplication(userID, req.JobID, req.CoverLetter)
	if err != nil {
		return nil, errors.New("failed to apply to job")
	}

	applications, err := s.repo.GetUserApplications(userID)
	if err != nil {
		return nil, errors.New("failed to fetch application")
	}

	// Find the newly created application
	for _, app := range applications {
		if app.ApplicationID == applicationID {
			return &app, nil
		}
	}

	return nil, errors.New("application created but not found")
}

func (s *Service) GetApplications(userID string) ([]JobApplicationResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	applications, err := s.repo.GetUserApplications(userID)
	if err != nil {
		return nil, errors.New("failed to fetch applications")
	}

	return applications, nil
}

func (s *Service) SearchJobs(query string, filters map[string]interface{}) ([]JobSearchResponse, error) {
	if filters == nil {
		filters = make(map[string]interface{})
	}

	jobs, err := s.repo.FindJobs(query, filters)
	if err != nil {
		return nil, errors.New("failed to search jobs")
	}

	return jobs, nil
}
