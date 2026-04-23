package job

import (
	"errors"
	"time"

	"github.com/nile-connect/backend/domain/application"
	"github.com/nile-connect/backend/internal/database"
)

// JobService defines the interface for job operations
type JobService interface {
	// Job listing and search
	ListJobs(filters *JobFilters) ([]JobSummary, error)
	SearchJobs(query string, filters *JobFilters) ([]JobSummary, error)
	GetJobDetails(jobID string) (*JobDetails, error)
	
	// Job management (for employers)
	GetJobStats(jobID string) (*JobStatistics, error)
	
	// Application management (for students)
	ApplyToJob(studentID, jobID string, coverLetter string) error
	WithdrawApplication(studentID, applicationID string) error
	GetStudentApplications(studentID string) ([]StudentApplication, error)
	
	// Saved jobs
	SaveJob(studentID, jobID string) error
	UnsaveJob(studentID, jobID string) error
	GetSavedJobs(studentID string) ([]JobSummary, error)
}

// Service implements JobService interface
type Service struct {
	repo        JobRepository
	appRepo     application.ApplicationRepository
}

func NewService(repo JobRepository, appRepo application.ApplicationRepository) *Service {
	return &Service{repo: repo, appRepo: appRepo}
}

// JobFilters contains filtering options for job listings
type JobFilters struct {
	Type      string
	Location  string
	Industry  string
	MinSalary int
	MaxSalary int
	Remote    *bool
	Limit     int
	Offset    int
}

// JobSummary represents a brief overview of a job
type JobSummary struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	CompanyName string    `json:"company_name"`
	Type        string    `json:"type"`
	Location    string    `json:"location"`
	Salary      string    `json:"salary"`
	Industry    string    `json:"industry"`
	PostedAt    time.Time `json:"posted_at"`
	Applicants  int       `json:"applicant_count"`
	IsSaved     bool      `json:"is_saved,omitempty"`
	MatchScore  int       `json:"match_score,omitempty"`
}

// JobDetails contains comprehensive information about a job
type JobDetails struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Requirements  []string  `json:"requirements"`
	Type          string    `json:"type"`
	Location      string    `json:"location"`
	Salary        string    `json:"salary"`
	Industry      string    `json:"industry"`
	CompanyName   string    `json:"company_name"`
	CompanyAbout  string    `json:"company_about"`
	ApplicantCount int      `json:"applicant_count"`
	Deadline      time.Time `json:"deadline"`
	PostedAt      time.Time `json:"posted_at"`
	Status        string    `json:"status"`
	IsSaved       bool      `json:"is_saved,omitempty"`
}

// JobStatistics contains statistics about a job post
type JobStatistics struct {
	TotalApplicants int       `json:"total_applicants"`
	PendingReview   int       `json:"pending_review"`
	InterviewStage  int       `json:"interview_stage"`
	OffersExtended  int       `json:"offers_extended"`
	Rejected        int       `json:"rejected"`
	AvgTimeToApply  time.Duration `json:"average_time_to_apply"`
}

// StudentApplication represents an application from a student
type StudentApplication struct {
	ID          string    `json:"id"`
	JobID       string    `json:"job_id"`
	JobTitle    string    `json:"job_title"`
	CompanyName string    `json:"company_name"`
	Status      string    `json:"status"`
	AppliedAt   time.Time `json:"applied_at"`
	CoverLetter string    `json:"cover_letter"`
}

func (s *Service) ListJobs(filters *JobFilters) ([]JobSummary, error) {
	if filters == nil {
		filters = &JobFilters{Limit: 20, Offset: 0}
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}

	jobs, err := s.repo.FindActiveJobs(filters)
	if err != nil {
		return nil, errors.New("failed to fetch jobs")
	}

	summaries := make([]JobSummary, len(jobs))
	for i, job := range jobs {
		summaries[i] = s.jobToSummary(&job)
	}

	return summaries, nil
}

func (s *Service) SearchJobs(query string, filters *JobFilters) ([]JobSummary, error) {
	if query == "" {
		return nil, errors.New("search query is required")
	}

	if filters == nil {
		filters = &JobFilters{Limit: 20, Offset: 0}
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}

	jobs, err := s.repo.SearchJobs(query, filters)
	if err != nil {
		return nil, errors.New("failed to search jobs")
	}

	summaries := make([]JobSummary, len(jobs))
	for i, job := range jobs {
		summaries[i] = s.jobToSummary(&job)
	}

	return summaries, nil
}

func (s *Service) GetJobDetails(jobID string) (*JobDetails, error) {
	if jobID == "" {
		return nil, errors.New("job ID is required")
	}

	job, err := s.repo.FindByID(jobID)
	if err != nil {
		return nil, errors.New("job not found")
	}

	if job.Status != database.JobStatusActive {
		return nil, errors.New("job is not available")
	}

	return s.jobToDetails(job), nil
}

func (s *Service) GetJobStats(jobID string) (*JobStatistics, error) {
	if jobID == "" {
		return nil, errors.New("job ID is required")
	}

	stats, err := s.repo.GetJobStatistics(jobID)
	if err != nil {
		return nil, errors.New("failed to fetch job statistics")
	}

	return stats, nil
}

func (s *Service) ApplyToJob(studentID, jobID string, coverLetter string) error {
	if studentID == "" || jobID == "" {
		return errors.New("student ID and job ID are required")
	}

	// Check if job exists and is active
	job, err := s.repo.FindByID(jobID)
	if err != nil {
		return errors.New("job not found")
	}
	
	// Check job status (business logic)
	if job.Status != "active" {
		return errors.New("job is not currently accepting applications")
	}

	// Check if deadline has passed (business logic)
	if !job.Deadline.IsZero() && time.Now().After(job.Deadline) {
		return errors.New("application deadline has passed")
	}

	// Check if already applied (business logic)
	hasApplied, err := s.appRepo.HasApplied(studentID, jobID)
	if err != nil {
		return errors.New("failed to check existing application")
	}
	if hasApplied {
		return errors.New("already applied to this job")
	}

	// Create application object
	application := &database.Application{
		JobID:     jobID,
		StudentID: studentID,
		Status:    database.ApplicationStatusApplied,
	}
	
	// Create the application using application repository
	err = s.appRepo.CreateApplication(application)
	if err != nil {
		return errors.New("failed to submit application")
	}

	return nil
}

func (s *Service) WithdrawApplication(studentID, applicationID string) error {
	if studentID == "" || applicationID == "" {
		return errors.New("student ID and application ID are required")
	}

	// Verify the application belongs to the student
	application, err := s.appRepo.FindApplicationByID(applicationID)
	if err != nil {
		return errors.New("application not found")
	}

	if application.StudentID != studentID {
		return errors.New("unauthorized to withdraw this application")
	}

	if application.Status == database.ApplicationStatusRejected || 
	   application.Status == database.ApplicationStatusOffer {
		return errors.New("cannot withdraw application in current status")
	}

	err = s.appRepo.DeleteApplication(applicationID)
	if err != nil {
		return errors.New("failed to withdraw application")
	}

	return nil
}

func (s *Service) GetStudentApplications(studentID string) ([]StudentApplication, error) {
	if studentID == "" {
		return nil, errors.New("student ID is required")
	}

	applications, err := s.appRepo.GetStudentApplications(studentID)
	if err != nil {
		return nil, errors.New("failed to fetch applications")
	}

	result := make([]StudentApplication, len(applications))
	for i, app := range applications {
		var appliedAt time.Time
		if app.AppliedAt != nil {
			appliedAt = *app.AppliedAt
		}

		result[i] = StudentApplication{
			ID:          app.ID,
			JobID:       app.JobID,
		JobTitle:    "", // Job Title would need to be queried separately
		CompanyName: "", // Company name would need to be queried separately
		Status:      string(app.Status),
		AppliedAt:   appliedAt,
		CoverLetter: "", // CoverLetter field doesn't exist in Application struct
		}
	}

	return result, nil
}

func (s *Service) SaveJob(studentID, jobID string) error {
	if studentID == "" || jobID == "" {
		return errors.New("student ID and job ID are required")
	}

	// Check if job exists
	exists, err := s.repo.JobExists(jobID)
	if err != nil {
		return errors.New("failed to verify job")
	}
	if !exists {
		return errors.New("job not found")
	}

	err = s.repo.SaveJob(studentID, jobID)
	if err != nil {
		return errors.New("failed to save job")
	}

	return nil
}

func (s *Service) UnsaveJob(studentID, jobID string) error {
	if studentID == "" || jobID == "" {
		return errors.New("student ID and job ID are required")
	}

	err := s.repo.UnsaveJob(studentID, jobID)
	if err != nil {
		return errors.New("failed to unsave job")
	}

	return nil
}

func (s *Service) GetSavedJobs(studentID string) ([]JobSummary, error) {
	if studentID == "" {
		return nil, errors.New("student ID is required")
	}

	jobs, err := s.repo.GetSavedJobs(studentID)
	if err != nil {
		return nil, errors.New("failed to fetch saved jobs")
	}

	summaries := make([]JobSummary, len(jobs))
	for i, job := range jobs {
		summary := s.jobToSummary(&job)
		summary.IsSaved = true
		summaries[i] = summary
	}

	return summaries, nil
}

// Helper methods
func (s *Service) jobToSummary(job *database.Job) JobSummary {
	return JobSummary{
		ID:          job.ID,
		Title:       job.Title,
		CompanyName: getCompanyName(job),
		Type:        string(job.Type),
		Location:    job.Location,
		Salary:      job.Salary,
		Industry:    getJobIndustry(job),
		PostedAt:    job.CreatedAt,
		Applicants:  job.ApplicantCount,
	}
}

func (s *Service) jobToDetails(job *database.Job) *JobDetails {
	var requirements []string
	// Parse requirements from the stored string
	if job.Requirements != "" {
		// Basic parsing - would need proper JSON unmarshaling
		requirements = []string{job.Requirements}
	}

	return &JobDetails{
		ID:            job.ID,
		Title:         job.Title,
		Description:   job.Description,
		Requirements:  requirements,
		Type:          string(job.Type),
		Location:      job.Location,
		Salary:        job.Salary,
		Industry:      getJobIndustry(job),
		CompanyName:   getCompanyName(job),
		CompanyAbout:  getCompanyAbout(job),
		ApplicantCount: job.ApplicantCount,
		Deadline:      job.Deadline,
		PostedAt:      job.CreatedAt,
		Status:        string(job.Status),
	}
}

func getCompanyName(job *database.Job) string {
	// Since EmployerProfile is a relationship, this will be nil unless preloaded
	// Return empty for now until we properly implement the relationship
	return ""
}

func getCompanyAbout(job *database.Job) string {
	// Since EmployerProfile is a relationship, this will be nil unless preloaded  
	// Return empty for now until we properly implement the relationship
	return ""
}

func getJobIndustry(job *database.Job) string {
	// Industry is not directly on the Job model, it's on the EmployerProfile
	// Return empty for now until we properly implement the relationship
	return ""
}

func getEmployerName(app *database.Application) string {
	// Get employer name from related EmployerProfile through Job
	// Return empty for now until we properly implement the relationship
	return ""
}