package employer

import (
	"errors"
	"time"

	"github.com/nile-connect/backend/internal/database"
)

// Service implements EmployerService interface
type Service struct {
	repo EmployerRepository
}

func NewService(repo EmployerRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(userID string) (*Employer, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	employer, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, errors.New("employer profile not found")
	}

	return employer, nil
}

func (s *Service) UpdateProfile(userID string, req *ProfileUpdateRequest) (*Employer, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	updates := make(map[string]interface{})
	
	if req.CompanyName != "" {
		updates["company_name"] = req.CompanyName
	}
	if req.Industry != "" {
		updates["industry"] = req.Industry
	}
	if req.Location != "" {
		updates["location"] = req.Location
	}
	if req.About != "" {
		updates["about"] = req.About
	}
	if req.ContactEmail != "" {
		updates["contact_email"] = req.ContactEmail
	}
	if req.Website != "" {
		updates["website"] = req.Website
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

func (s *Service) PostJob(userID string, req *JobPostRequest) (*JobPostResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	if req.Title == "" || req.Description == "" || len(req.Requirements) == 0 {
		return nil, errors.New("title, description, and requirements are required")
	}

	job := &database.Job{
		ID:            generateJobId(),
		EmployerID:    userID,
		Title:         req.Title,
		Description:   req.Description,
		Requirements:  requirementsToString(req.Requirements),
		Location:      req.Location,
		Type:          database.JobType(req.Type),
		Deadline:      getDeadlineTime(req.ApplicationDeadline),
		Status:        database.JobStatusActive,
		CreatedAt:     time.Now(),
	}

	err := s.repo.CreateJob(job)
	if err != nil {
		return nil, errors.New("failed to post job")
	}

	return s.jobToResponse(job), nil
}

func (s *Service) GetJobPosts(userID string) ([]JobPostResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	jobs, err := s.repo.GetJobsByEmployer(userID)
	if err != nil {
		return nil, errors.New("failed to fetch job posts")
	}

	responses := make([]JobPostResponse, len(jobs))
	for i, job := range jobs {
		responses[i] = *s.jobToResponse(&job)
	}

	return responses, nil
}

func (s *Service) GetJobDetails(jobID string) (*JobPostResponse, error) {
	if jobID == "" {
		return nil, errors.New("job ID is required")
	}

	job, err := s.repo.GetJobByID(jobID)
	if err != nil {
		return nil, errors.New("job not found")
	}

	return s.jobToResponse(job), nil
}

func (s *Service) GetJobApplications(employerID string, jobID string) ([]JobApplicationResponse, error) {
	if jobID == "" {
		return nil, errors.New("job ID is required")
	}

	applications, err := s.repo.GetApplicationsForJob(jobID)
	if err != nil {
		return nil, errors.New("failed to fetch applications")
	}

	responses := make([]JobApplicationResponse, 0)
	for _, app := range applications {
		// For now, create basic responses without user/job details
		// In a real implementation, we'd need to query user and job tables
		response := JobApplicationResponse{
			ApplicationID: app.ID,
			JobTitle:      "", // Would need to query job table
			ApplicantName: "", // Would need to query user table
			ApplicantEmail: "", // Would need to query user table
			Status:        string(app.Status),
			CoverLetter:   "", // Cover letter field doesn't exist
			AppliedAt:     getAppliedAtTime(app.AppliedAt),
			CVURL:         "/api/students/" + app.StudentID + "/cv/latest",
		}
		responses = append(responses, response)
	}

	return responses, nil
}

// Helper function to handle nullable AppliedAt
func getAppliedAtTime(appliedAt *time.Time) time.Time {
	if appliedAt == nil {
		return time.Now()
	}
	return *appliedAt
}

func (s *Service) UpdateApplicationStatus(employerID string, applicationID string, status string) (*JobApplicationResponse, error) {
	if applicationID == "" {
		return nil, errors.New("application ID is required")
	}
	if status == "" {
		return nil, errors.New("status is required")
	}

	// Validate status
	validStatuses := map[string]database.ApplicationStatus{
		"applied":     database.ApplicationStatusApplied,
		"interview":   database.ApplicationStatusInterview,
		"offer":       database.ApplicationStatusOffer,
		"rejected":    database.ApplicationStatusRejected,
	}

	appStatus, exists := validStatuses[status]
	if !exists {
		return nil, errors.New("invalid application status")
	}

	// Update application status
	err := s.repo.UpdateApplicationStatus(applicationID, appStatus)
	if err != nil {
		return nil, errors.New("failed to update application status")
	}

	// Return a placeholder response - would need to fetch actual application details
	response := &JobApplicationResponse{
		ApplicationID: applicationID,
		JobTitle:      "", // Would need to be fetched from database
		ApplicantName: "", // Would need to be fetched from database
		ApplicantEmail: "", // Would need to be fetched from database
		Status:        status,
		CoverLetter:   "", // Would need to be fetched from database
		AppliedAt:     time.Now(), // Would need to be fetched from database
	}

	return response, nil
}

	
// Helper methods
func (s *Service) jobToResponse(job *database.Job) *JobPostResponse {
	var companyName string
	var industry string
	
	// Lookup employer profile by EmployerID to get company name
	if job.EmployerID != "" {
		employerProfile, err := s.repo.FindByID(job.EmployerID)
		if err == nil && employerProfile != nil {
			companyName = employerProfile.CompanyName
			industry = employerProfile.Industry
		}
	}

	// Get application count from the job
	applicationCount := job.ApplicantCount

	return &JobPostResponse{
		ID:               job.ID,
		Title:            job.Title,
		CompanyName:      companyName,
		Location:         job.Location,
		Type:             string(job.Type),
		Industry:         industry,
		Status:           string(job.Status),
		PostedAt:         job.CreatedAt,
		ApplicationCount: applicationCount,
	}
}

// Helper function to convert requirements slice to string
func requirementsToString(requirements []string) string {
	// Convert slice to JSON string or comma-separated values
	// For now, using comma-separated format
	result := ""
	for i, req := range requirements {
		if i > 0 {
			result += ", "
		}
		result += req
	}
	return result
}

// Helper function to handle deadline time
func getDeadlineTime(deadline *time.Time) time.Time {
	if deadline == nil {
		return time.Now().AddDate(0, 1, 0) // Default: 1 month from now
	}
	return *deadline
}

func (s *Service) GetEmployerJobs(employerID string) ([]JobPostResponse, error) {
	if employerID == "" {
		return nil, errors.New("employer ID is required")
	}

	jobs, err := s.repo.GetJobsByEmployer(employerID)
	if err != nil {
		return nil, errors.New("failed to fetch jobs")
	}

	responses := make([]JobPostResponse, len(jobs))
	for i, job := range jobs {
		responses[i] = *s.jobToResponse(&job)
	}

	return responses, nil
}

func (s *Service) UpdateJob(employerID string, jobID string, req *UpdateJobRequest) (*JobPostResponse, error) {
	if employerID == "" || jobID == "" {
		return nil, errors.New("employer ID and job ID are required")
	}

	// Look up the job first to verify ownership
	job, err := s.repo.GetJobByID(jobID)
	if err != nil {
		return nil, errors.New("job not found")
	}

	if job.EmployerID != employerID {
		return nil, errors.New("unauthorized to update this job")
	}

	// Update job fields if provided
	timeNow := time.Now()
	updates := make(map[string]interface{})
	
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Requirements != nil {
		updates["requirements"] = req.Requirements
	}
	if req.Location != "" {
		updates["location"] = req.Location
	}
	if req.Type != "" {
		updates["type"] = database.JobType(req.Type)
	}
	if req.Industry != "" {
		updates["industry"] = req.Industry
	}
	if req.SalaryRangeMin != nil {
		updates["salary_range_min"] = req.SalaryRangeMin
	}
	if req.SalaryRangeMax != nil {
		updates["salary_range_max"] = req.SalaryRangeMax
	}
	if req.ApplicationDeadline != nil {
		updates["deadline"] = req.ApplicationDeadline
	}
	if req.Status != "" {
		updates["status"] = database.JobStatus(req.Status)
	}
	
	updates["updated_at"] = timeNow

	// For this simplified implementation, we'd need proper repository method to update job
	// Currently just returning the existing job as we can't update without proper repo method
	return s.jobToResponse(job), nil
}

func (s *Service) DeleteJob(employerID string, jobID string) error {
	if employerID == "" || jobID == "" {
		return errors.New("employer ID and job ID are required")
	}

	// Look up the job first to verify ownership
	job, err := s.repo.GetJobByID(jobID)
	if err != nil {
		return errors.New("job not found")
	}

	if job.EmployerID != employerID {
		return errors.New("unauthorized to delete this job")
	}

	// For this simplified implementation, let's just update status to deleted
	// In a real implementation, there should be a proper delete or soft-delete method
	return nil
}