package staff

import "time"

type StaffProfile struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type DashboardStats struct {
	TotalStudents      int64 `json:"total_students"`
	TotalEmployers     int64 `json:"total_employers"`
	PendingEmployers   int64 `json:"pending_employers"`
	ActiveJobs         int64 `json:"active_jobs"`
	PendingJobs        int64 `json:"pending_jobs"`
	TotalApplications  int64 `json:"total_applications"`
	UpcomingEvents     int64 `json:"upcoming_events"`
}

type ApplicationSummary struct {
	ID        string     `json:"id"`
	StudentID string     `json:"student_id"`
	Student   string     `json:"student_name"`
	JobID     string     `json:"job_id"`
	JobTitle  string     `json:"job_title"`
	Company   string     `json:"company"`
	Status    string     `json:"status"`
	AppliedAt *time.Time `json:"applied_at"`
}

type JobSummary struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Company     string    `json:"company"`
	EmployerID  string    `json:"employer_id"`
	Type        string    `json:"type"`
	Location    string    `json:"location"`
	Status      string    `json:"status"`
	PostedAt    time.Time `json:"posted_at"`
}

type EmployerSummary struct {
	ID          string    `json:"id"`
	CompanyName string    `json:"company_name"`
	Industry    string    `json:"industry"`
	Location    string    `json:"location"`
	Email       string    `json:"contact_email"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type StudentSummary struct {
	ID             string    `json:"id"`
	FullName       string    `json:"full_name"`
	Email          string    `json:"email"`
	Major          string    `json:"major"`
	GraduationYear int       `json:"graduation_year"`
	IsVerified     bool      `json:"is_verified"`
	CreatedAt      time.Time `json:"created_at"`
}
