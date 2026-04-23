package employer

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

func (r *Repository) FindByID(id string) (*Employer, error) {
	var user database.User
	result := r.db.Where("id = ? AND role = ?", id, database.RoleEmployer).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	var profile database.EmployerProfile
	if err := r.db.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		return nil, err
	}

	return r.userAndProfileToEmployer(&user, &profile), nil
}

func (r *Repository) UpdateProfile(id string, updates map[string]interface{}) error {
	// Update user fields if any
	userUpdates := make(map[string]interface{})
	if fullName, ok := updates["full_name"]; ok {
		userUpdates["full_name"] = fullName
	}

	if len(userUpdates) > 0 {
		if err := r.db.Model(&database.User{}).Where("id = ? AND role = ?", id, database.RoleEmployer).Updates(userUpdates).Error; err != nil {
			return err
		}
	}

	// Update profile fields
	profileUpdates := make(map[string]interface{})
	if companyName, ok := updates["company_name"]; ok {
		profileUpdates["company_name"] = companyName
	}
	if industry, ok := updates["industry"]; ok {
		profileUpdates["industry"] = industry
	}
	if location, ok := updates["location"]; ok {
		profileUpdates["location"] = location
	}
	if about, ok := updates["about"]; ok {
		profileUpdates["about"] = about
	}
	if contactEmail, ok := updates["contact_email"]; ok {
		profileUpdates["contact_email"] = contactEmail
	}
	if website, ok := updates["website"]; ok {
		profileUpdates["website"] = website
	}

	if len(profileUpdates) > 0 {
		return r.db.Model(&database.EmployerProfile{}).Where("user_id = ?", id).Updates(profileUpdates).Error
	}

	return nil
}

func (r *Repository) CreateJob(job *database.Job) error {
	return r.db.Create(job).Error
}

func (r *Repository) GetJobsByEmployer(employerID string) ([]database.Job, error) {
	var jobs []database.Job
	result := r.db.Where("employer_id = ?", employerID).Order("created_at DESC").Find(&jobs)
	return jobs, result.Error
}

func (r *Repository) GetJobByID(jobID string) (*database.Job, error) {
	var job database.Job
	result := r.db.Where("id = ?", jobID).Preload("EmployerProfile").First(&job)
	return &job, result.Error
}

func (r *Repository) GetApplicationsForJob(jobID string) ([]database.Application, error) {
	var applications []database.Application
	result := r.db.Where("job_id = ?", jobID).
		Preload("User").
		Preload("Job").
		Order("applied_at DESC").
		Find(&applications)
	return applications, result.Error
}

func (r *Repository) UpdateApplicationStatus(applicationID string, status database.ApplicationStatus) error {
	return r.db.Model(&database.Application{}).
		Where("id = ?", applicationID).
		Update("status", status).Error
}

// Helper methods
func (r *Repository) userAndProfileToEmployer(user *database.User, profile *database.EmployerProfile) *Employer {
	return &Employer{
		ID:           user.ID,
		FullName:     user.FullName,
		Username:     user.Username,
		Email:        user.Email,
		IsVerified:   user.IsVerified,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
		CompanyName:  profile.CompanyName,
		Industry:     profile.Industry,
		Location:     profile.Location,
		About:        profile.About,
		ContactEmail: profile.ContactEmail,
		Website:      profile.Website,
		Status:       string(profile.Status),
	}
}

func generateJobId() string {
	return "job_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
