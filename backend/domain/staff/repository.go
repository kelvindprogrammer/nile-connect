package staff

import (
	"github.com/nile-connect/backend/internal/database"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetStats() (*DashboardStats, error) {
	stats := &DashboardStats{}
	r.db.Model(&database.User{}).Where("role = ?", "student").Count(&stats.TotalStudents)
	r.db.Model(&database.User{}).Where("role = ?", "employer").Count(&stats.TotalEmployers)
	r.db.Model(&database.EmployerProfile{}).Where("status = ?", "pending").Count(&stats.PendingEmployers)
	r.db.Model(&database.Job{}).Where("status = ?", "active").Count(&stats.ActiveJobs)
	r.db.Model(&database.Job{}).Where("status = ?", "pending").Count(&stats.PendingJobs)
	r.db.Model(&database.Application{}).Count(&stats.TotalApplications)
	return stats, nil
}

func (r *Repository) GetAllApplications() ([]ApplicationSummary, error) {
	var apps []database.Application
	if err := r.db.Order("created_at DESC").Find(&apps).Error; err != nil {
		return nil, err
	}

	result := make([]ApplicationSummary, 0, len(apps))
	for _, a := range apps {
		s := ApplicationSummary{
			ID:        a.ID,
			StudentID: a.StudentID,
			JobID:     a.JobID,
			Status:    string(a.Status),
			AppliedAt: a.AppliedAt,
		}
		var student database.User
		if r.db.Select("full_name").Where("id = ?", a.StudentID).First(&student).Error == nil {
			s.Student = student.FullName
		}
		var job database.Job
		if r.db.Select("title, employer_id").Where("id = ?", a.JobID).First(&job).Error == nil {
			s.JobTitle = job.Title
			var ep database.EmployerProfile
			if r.db.Select("company_name").Where("user_id = ?", job.EmployerID).First(&ep).Error == nil {
				s.Company = ep.CompanyName
			}
		}
		result = append(result, s)
	}
	return result, nil
}

func (r *Repository) GetAllJobs() ([]JobSummary, error) {
	var jobs []database.Job
	if err := r.db.Order("created_at DESC").Find(&jobs).Error; err != nil {
		return nil, err
	}
	result := make([]JobSummary, 0, len(jobs))
	for _, j := range jobs {
		s := JobSummary{
			ID:         j.ID,
			Title:      j.Title,
			EmployerID: j.EmployerID,
			Type:       string(j.Type),
			Location:   j.Location,
			Status:     string(j.Status),
			PostedAt:   j.CreatedAt,
		}
		var ep database.EmployerProfile
		if r.db.Select("company_name").Where("user_id = ?", j.EmployerID).First(&ep).Error == nil {
			s.Company = ep.CompanyName
		}
		result = append(result, s)
	}
	return result, nil
}

func (r *Repository) UpdateJobStatus(jobID, status string) error {
	return r.db.Model(&database.Job{}).Where("id = ?", jobID).Update("status", status).Error
}

func (r *Repository) GetAllEmployers() ([]EmployerSummary, error) {
	var profiles []database.EmployerProfile
	if err := r.db.Order("created_at DESC").Find(&profiles).Error; err != nil {
		return nil, err
	}
	result := make([]EmployerSummary, 0, len(profiles))
	for _, p := range profiles {
		result = append(result, EmployerSummary{
			ID:          p.ID,
			CompanyName: p.CompanyName,
			Industry:    p.Industry,
			Location:    p.Location,
			Email:       p.ContactEmail,
			Status:      string(p.Status),
			CreatedAt:   p.CreatedAt,
		})
	}
	return result, nil
}

func (r *Repository) UpdateEmployerStatus(employerProfileID, status string) error {
	return r.db.Model(&database.EmployerProfile{}).Where("id = ?", employerProfileID).Update("status", status).Error
}

func (r *Repository) GetAllStudents() ([]StudentSummary, error) {
	var users []database.User
	if err := r.db.Where("role = ?", "student").Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}
	result := make([]StudentSummary, 0, len(users))
	for _, u := range users {
		result = append(result, StudentSummary{
			ID:             u.ID,
			FullName:       u.FullName,
			Email:          u.Email,
			Major:          u.Major,
			GraduationYear: u.GraduationYear,
			IsVerified:     u.IsVerified,
			CreatedAt:      u.CreatedAt,
		})
	}
	return result, nil
}

func (r *Repository) FindStaffByID(id string) (*database.User, error) {
	var user database.User
	return &user, r.db.Where("id = ? AND role = ?", id, "staff").First(&user).Error
}
