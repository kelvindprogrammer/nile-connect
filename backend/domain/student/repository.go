package student

import (
	"time"

	"github.com/nile-connect/backend/internal/database"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindByID(id string) (*Student, error) {
	var user database.User
	result := r.db.Where("id = ? AND role = ?", id, database.RoleStudent).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	student := r.userToStudent(&user)
	return student, nil
}

func (r *Repository) UpdateProfile(id string, updates map[string]interface{}) error {
	result := r.db.Model(&database.User{}).Where("id = ? AND role = ?", id, database.RoleStudent).Updates(updates)
	return result.Error
}

func (r *Repository) SaveCV(userID string, cvData CVUploadRequest) (string, error) {
	// Create a unique CV ID
	cvID := generateCVId()

	cv := database.CVDocument{
		ID:               cvID,
		StudentID:        userID,
		OriginalFilename: cvData.Filename,
		FileUrl:          string(cvData.Content), // Assuming frontend generated a URL, or adapt to logic
		UploadedAt:       time.Now(),
	}

	result := r.db.Create(&cv)
	if result.Error != nil {
		return "", result.Error
	}

	return cvID, nil
}

func (r *Repository) GetCV(userID string, cvID string) (*CVUploadRequest, error) {
	var cv database.CVDocument
	result := r.db.Where("id = ? AND student_id = ?", cvID, userID).First(&cv)
	if result.Error != nil {
		return nil, result.Error
	}

	return &CVUploadRequest{
		Filename: cv.OriginalFilename,
		Content:  []byte(cv.FileUrl),
	}, nil
}

func (r *Repository) DeleteCV(userID string, cvID string) error {
	result := r.db.Where("id = ? AND student_id = ?", cvID, userID).Delete(&database.CVDocument{})
	return result.Error
}

func (r *Repository) CreateJobApplication(userID, jobID, coverLetter string) (string, error) {
	applicationID := generateApplicationId()
	appliedAt := time.Now()

	application := database.Application{
		ID:        applicationID,
		StudentID: userID,
		JobID:     jobID,
		Status:    database.ApplicationStatusApplied,
		AppliedAt: &appliedAt,
	}

	result := r.db.Create(&application)
	if result.Error != nil {
		return "", result.Error
	}

	return applicationID, nil
}

func (r *Repository) GetUserApplications(userID string) ([]JobApplicationResponse, error) {
	var applications []database.Application
	result := r.db.Where("student_id = ?", userID).Find(&applications)
	if result.Error != nil {
		return nil, result.Error
	}

	response := make([]JobApplicationResponse, len(applications))
	for i, app := range applications {
		// Look up the job title for this application
		var job database.Job
		jobResult := r.db.Select("title").Where("id = ?", app.JobID).First(&job)

		var jobTitle string
		if jobResult.Error == nil {
			jobTitle = job.Title
		}

		var appliedAt time.Time
		if app.AppliedAt != nil {
			appliedAt = *app.AppliedAt
		}

		response[i] = JobApplicationResponse{
			ApplicationID: app.ID,
			JobTitle:      jobTitle,
			Status:        string(app.Status),
			AppliedAt:     appliedAt,
		}
	}

	return response, nil
}

func (r *Repository) FindJobs(query string, filters map[string]interface{}) ([]JobSearchResponse, error) {
	var jobs []database.Job

	db := r.db.Where("status = ?", database.JobStatusActive)

	if query != "" {
		db = db.Where("title ILIKE ? OR description ILIKE ?", "%"+query+"%", "%"+query+"%")
	}

	if industry, ok := filters["industry"]; ok {
		db = db.Where("industry = ?", industry)
	}

	if location, ok := filters["location"]; ok {
		db = db.Where("location ILIKE ?", "%"+location.(string)+"%")
	}

	if jobType, ok := filters["type"]; ok {
		db = db.Where("type = ?", jobType)
	}

	result := db.Order("created_at DESC").Find(&jobs)
	if result.Error != nil {
		return nil, result.Error
	}

	response := make([]JobSearchResponse, len(jobs))
	for i, job := range jobs {
		// Look up employer profile to get company name
		var employerProfile database.EmployerProfile
		err := r.db.Select("company_name").Where("id = ?", job.EmployerID).First(&employerProfile)

		var company string
		if err == nil {
			company = employerProfile.CompanyName
		}

		// Convert job.Requirements string to []string
		var requirements []string
		if job.Requirements != "" {
			// Simple split by comma for now - adjust based on actual format
			requirements = []string{job.Requirements}
		}

		response[i] = JobSearchResponse{
			JobID:               job.ID,
			Title:               job.Title,
			Company:             company,
			Location:            job.Location,
			Type:                string(job.Type),
			Description:         job.Description,
			Requirements:        requirements,
			PostedAt:            job.CreatedAt,
			ApplicationDeadline: &job.Deadline,
		}
	}

	return response, nil
}

// Helper methods
func (r *Repository) userToStudent(user *database.User) *Student {

	var studentSubtype string
	if user.StudentSubtype != nil {
		studentSubtype = string(*user.StudentSubtype)
	}

	return &Student{
		ID:             user.ID,
		FullName:       user.FullName,
		Username:       user.Username,
		Email:          user.Email,
		StudentSubtype: studentSubtype,
		Major:          user.Major,
		GraduationYear: user.GraduationYear,
		// GPA, Skills, Interests, ProfilePicURL would need separate StudentProfile table
		IsVerified: user.IsVerified,
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.UpdatedAt,
	}
}

func generateCVId() string {
	return "cv_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

func generateApplicationId() string {
	return "app_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
