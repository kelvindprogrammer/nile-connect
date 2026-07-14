package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"nile-connect/lib/admin"
	"nile-connect/lib/db"
	"nile-connect/lib/email"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/notify"
	"nile-connect/lib/respond"
)

// Handler is the single entrypoint for all /api/staff/* routes.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	// Look up the user's live role directly — zero trust in JWT role claim.
	var staffUser models.User
	if err := database.Where("id = ? AND role = ? AND deleted_at IS NULL", auth.UserID, "staff").First(&staffUser).Error; err != nil {
		respond.Error(w, http.StatusForbidden, "staff access required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "dashboard":
		staffDashboard(w, r)
	case "applications":
		staffApplications(w, r)
	case "jobs":
		staffJobs(w, r, auth.UserID)
	case "employers":
		staffEmployers(w, r)
	case "students":
		staffStudents(w, r)
	case "student-detail":
		staffStudentDetail(w, r)
	case "service-requests":
		staffServiceRequests(w, r, auth.UserID)
	case "cleanup":
		staffCleanup(w, r)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── dashboard ─────────────────────────────────────────────────────────────────

func staffDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var stats struct {
		TotalStudents     int64 `json:"total_students"`
		TotalEmployers    int64 `json:"total_employers"`
		PendingEmployers  int64 `json:"pending_employers"`
		ActiveJobs        int64 `json:"active_jobs"`
		PendingJobs       int64 `json:"pending_jobs"`
		TotalApplications int64 `json:"total_applications"`
		UpcomingEvents    int64 `json:"upcoming_events"`
	}
	database.Model(&models.User{}).Where("role = ? AND deleted_at IS NULL", "student").Count(&stats.TotalStudents)
	database.Model(&models.EmployerProfile{}).Where("deleted_at IS NULL").Count(&stats.TotalEmployers)
	database.Model(&models.EmployerProfile{}).Where("status = ? AND deleted_at IS NULL", "pending").Count(&stats.PendingEmployers)
	database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "active").Count(&stats.ActiveJobs)
	database.Model(&models.Job{}).Where("status = ? AND deleted_at IS NULL", "pending").Count(&stats.PendingJobs)
	database.Model(&models.Application{}).Where("deleted_at IS NULL").Count(&stats.TotalApplications)
	database.Model(&models.Event{}).Where("date > ? AND deleted_at IS NULL", time.Now()).Count(&stats.UpcomingEvents)

	respond.OK(w, stats)
}

// ── applications ──────────────────────────────────────────────────────────────

func staffApplications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type appSum struct {
		ID          string     `json:"id"`
		StudentID   string     `json:"student_id"`
		Student     string     `json:"student_name"`
		JobID       string     `json:"job_id"`
		JobTitle    string     `json:"job_title"`
		Company     string     `json:"company"`
		Status      string     `json:"status"`
		Stage       string     `json:"stage"`
		AppliedAt   *time.Time `json:"applied_at"`
		CoverLetter string     `json:"cover_letter"`
		ResumeURL   string     `json:"resume_url"`
	}

	var apps []models.Application
	database.Where("deleted_at IS NULL").Find(&apps)

	result := make([]appSum, 0, len(apps))
	for _, a := range apps {
		sum := appSum{ID: a.ID, StudentID: a.StudentID, JobID: a.JobID, Status: a.Status, Stage: a.Stage, AppliedAt: a.AppliedAt, CoverLetter: a.CoverLetter, ResumeURL: a.ResumeURL}
		var student models.User
		if database.Where("id = ?", a.StudentID).First(&student).Error == nil {
			sum.Student = student.FullName
		}
		var job models.Job
		if database.Where("id = ?", a.JobID).First(&job).Error == nil {
			sum.JobTitle = job.Title
			var emp models.EmployerProfile
			if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
				sum.Company = emp.CompanyName
			}
		}
		result = append(result, sum)
	}
	respond.OK(w, map[string]any{"applications": result})
}

// ── jobs ──────────────────────────────────────────────────────────────────────

func staffJobs(w http.ResponseWriter, r *http.Request, staffUserID string) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type jobSum struct {
		ID         string    `json:"id"`
		Title      string    `json:"title"`
		Company    string    `json:"company"`
		EmployerID string    `json:"employer_id"`
		Type       string    `json:"type"`
		Location   string    `json:"location"`
		Status     string    `json:"status"`
		PostedAt   time.Time `json:"posted_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var jobs []models.Job
		database.Where("deleted_at IS NULL").Order("created_at desc").Find(&jobs)
		result := make([]jobSum, 0, len(jobs))
		for _, j := range jobs {
			s := jobSum{ID: j.ID, Title: j.Title, EmployerID: j.EmployerID, Type: j.Type, Location: j.Location, Status: j.Status, PostedAt: j.CreatedAt}
			var emp models.EmployerProfile
			if database.Where("user_id = ?", j.EmployerID).First(&emp).Error == nil {
				s.Company = emp.CompanyName
			}
			result = append(result, s)
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPost:
		var req struct {
			Title        string `json:"title"`
			Type         string `json:"type"`
			Location     string `json:"location"`
			Salary       string `json:"salary"`
			Description  string `json:"description"`
			Requirements string `json:"requirements"`
			Skills       string `json:"skills"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Title == "" || req.Location == "" || req.Description == "" {
			respond.Error(w, http.StatusBadRequest, "title, location and description are required")
			return
		}
		jobType := req.Type
		if jobType == "" {
			jobType = "full-time"
		}
		job := models.Job{
			EmployerID:   staffUserID,
			Title:        req.Title,
			Type:         jobType,
			Location:     req.Location,
			Salary:       req.Salary,
			Description:  req.Description,
			Requirements: req.Requirements,
			Skills:       req.Skills,
			Status:       "active",
		}
		if err := database.Create(&job).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create job")
			return
		}
		respond.OK(w, map[string]string{"message": "job posted", "id": job.ID})

	case http.MethodPut:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as ?id=")
			return
		}
		var req struct {
			Status          string `json:"status"`
			RejectionReason string `json:"rejection_reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		allowed := map[string]bool{"active": true, "pending": true, "rejected": true, "archived": true}
		if !allowed[req.Status] {
			respond.Error(w, http.StatusBadRequest, "invalid status value")
			return
		}

		var job models.Job
		if err := database.Where("id = ?", jobID).First(&job).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "job not found")
			return
		}

		updates := map[string]any{"status": req.Status}
		if req.Status == "active" {
			now := time.Now()
			updates["approved_by"] = staffUserID
			updates["approved_at"] = now
			updates["rejection_reason"] = ""
		} else if req.Status == "rejected" {
			updates["rejection_reason"] = req.RejectionReason
		}
		database.Model(&models.Job{}).Where("id = ?", jobID).Updates(updates)

		if req.Status == "active" || req.Status == "rejected" {
			var emp models.EmployerProfile
			database.Where("user_id = ?", job.EmployerID).First(&emp)
			if req.Status == "active" {
				notify.CreateAndEmail(database, job.EmployerID, staffUserID, "job_status", "Job approved",
					"Your job posting \""+job.Title+"\" is now live", "/employer/jobs",
					func() (string, string) { return email.JobApprovedTemplate(job.Title) })
			} else {
				notify.CreateAndEmail(database, job.EmployerID, staffUserID, "job_status", "Job needs changes",
					"Your job posting \""+job.Title+"\" was not approved", "/employer/jobs",
					func() (string, string) { return email.JobRejectedTemplate(job.Title, req.RejectionReason) })
			}
		}

		respond.OK(w, map[string]string{"message": "job status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── employers ─────────────────────────────────────────────────────────────────

func staffEmployers(w http.ResponseWriter, r *http.Request) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type empSum struct {
		ID            string    `json:"id"`
		CompanyName   string    `json:"company_name"`
		Industry      string    `json:"industry"`
		Location      string    `json:"location"`
		Email         string    `json:"contact_email"`
		Status        string    `json:"status"`
		IsVerified    bool      `json:"is_verified"`
		EmailVerified bool      `json:"email_verified"`
		CreatedAt     time.Time `json:"created_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var profiles []models.EmployerProfile
		database.Where("deleted_at IS NULL").Order("created_at desc").Find(&profiles)
		result := make([]empSum, 0, len(profiles))
		for _, p := range profiles {
			sum := empSum{
				ID: p.ID, CompanyName: p.CompanyName, Industry: p.Industry, Location: p.Location,
				Email: p.ContactEmail, Status: p.Status, IsVerified: p.IsVerified, CreatedAt: p.CreatedAt,
			}
			var ev models.EmailVerification
			if database.Where("user_id = ? AND verified_at IS NOT NULL", p.UserID).First(&ev).Error == nil {
				sum.EmailVerified = true
			}
			result = append(result, sum)
		}
		respond.OK(w, map[string]any{"employers": result})

	case http.MethodPut:
		profileID := r.URL.Query().Get("id")
		if profileID == "" {
			respond.Error(w, http.StatusBadRequest, "profile id required as ?id=")
			return
		}
		var req struct {
			Status     *string `json:"status"`
			IsVerified *bool   `json:"is_verified"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		var profile models.EmployerProfile
		if err := database.Where("id = ?", profileID).First(&profile).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "employer profile not found")
			return
		}

		updates := map[string]any{}
		if req.Status != nil {
			allowed := map[string]bool{"approved": true, "pending": true, "rejected": true}
			if !allowed[*req.Status] {
				respond.Error(w, http.StatusBadRequest, "invalid status value")
				return
			}
			updates["status"] = *req.Status
		}
		if req.IsVerified != nil {
			updates["is_verified"] = *req.IsVerified
		}
		if len(updates) > 0 {
			database.Model(&models.EmployerProfile{}).Where("id = ?", profileID).Updates(updates)
		}

		if req.Status != nil {
			notify.CreateAndEmail(database, profile.UserID, "", "employer_status", "Employer status updated",
				"Your employer account status is now "+*req.Status, "/employer/profile",
				func() (string, string) { return email.EmployerStatusTemplate(profile.CompanyName, *req.Status) })
		}
		if req.IsVerified != nil && *req.IsVerified {
			notify.CreateAndEmail(database, profile.UserID, "", "employer_verified", "Verification badge granted",
				profile.CompanyName+" is now verified", "/employer/profile",
				func() (string, string) { return email.EmployerVerifiedTemplate(profile.CompanyName) })
		}

		respond.OK(w, map[string]string{"message": "employer status updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── students ──────────────────────────────────────────────────────────────────

func staffStudents(w http.ResponseWriter, r *http.Request) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	type stuSum struct {
		ID             string    `json:"id"`
		FullName       string    `json:"full_name"`
		Email          string    `json:"email"`
		Major          string    `json:"major"`
		GraduationYear int       `json:"graduation_year"`
		IsVerified     bool      `json:"is_verified"`
		CreatedAt      time.Time `json:"created_at"`
	}

	switch r.Method {
	case http.MethodGet:
		var users []models.User
		database.Where("role = ? AND deleted_at IS NULL", "student").Order("created_at desc").Find(&users)

		result := make([]stuSum, 0, len(users))
		for _, u := range users {
			result = append(result, stuSum{ID: u.ID, FullName: u.FullName, Email: u.Email, Major: u.Major, GraduationYear: u.GraduationYear, IsVerified: u.IsVerified, CreatedAt: u.CreatedAt})
		}
		respond.OK(w, map[string]any{"students": result})

	case http.MethodPut:
		studentID := r.URL.Query().Get("id")
		if studentID == "" {
			respond.Error(w, http.StatusBadRequest, "student id required as ?id=")
			return
		}
		var req struct {
			Verified bool `json:"verified"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		database.Model(&models.User{}).Where("id = ? AND role = ?", studentID, "student").Update("is_verified", req.Verified)
		respond.OK(w, map[string]string{"message": "student verification updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── student detail ───────────────────────────────────────────────────────────

type studentDetailApp struct {
	ID          string     `json:"id"`
	JobID       string     `json:"job_id"`
	JobTitle    string     `json:"job_title"`
	Company     string     `json:"company"`
	Status      string     `json:"status"`
	AppliedAt   *time.Time `json:"applied_at"`
	CoverLetter string     `json:"cover_letter"`
	ResumeURL   string     `json:"resume_url"`
}

type studentDetailResp struct {
	ID              string              `json:"id"`
	FullName        string              `json:"full_name"`
	Username        string              `json:"username"`
	Email           string              `json:"email"`
	Major           string              `json:"major"`
	GraduationYear  int                 `json:"graduation_year"`
	IsVerified      bool                `json:"is_verified"`
	ResumeURL       string              `json:"resume_url"`
	StudentSubtype  string              `json:"student_subtype"`
	CreatedAt       time.Time           `json:"created_at"`
	Applications    []studentDetailApp  `json:"applications"`
	ServiceRequests []serviceRequestSum `json:"service_requests"`
}

func staffStudentDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	studentID := r.URL.Query().Get("id")
	if studentID == "" {
		respond.Error(w, http.StatusBadRequest, "student id required as ?id=")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var user models.User
	if err := database.Where("id = ? AND role = ? AND deleted_at IS NULL", studentID, "student").First(&user).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "student not found")
		return
	}

	resp := studentDetailResp{
		ID:             user.ID,
		FullName:       user.FullName,
		Username:       user.Username,
		Email:          user.Email,
		Major:          user.Major,
		GraduationYear: user.GraduationYear,
		IsVerified:     user.IsVerified,
		ResumeURL:      user.ResumeURL,
		StudentSubtype: user.StudentSubtype,
		CreatedAt:      user.CreatedAt,
	}

	var apps []models.Application
	database.Where("student_id = ? AND deleted_at IS NULL", studentID).Order("created_at desc").Find(&apps)
	resp.Applications = make([]studentDetailApp, 0, len(apps))
	for _, a := range apps {
		item := studentDetailApp{ID: a.ID, JobID: a.JobID, Status: a.Status, AppliedAt: a.AppliedAt, CoverLetter: a.CoverLetter, ResumeURL: a.ResumeURL}
		var job models.Job
		if database.Where("id = ?", a.JobID).First(&job).Error == nil {
			item.JobTitle = job.Title
			var emp models.EmployerProfile
			if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
				item.Company = emp.CompanyName
			}
		}
		resp.Applications = append(resp.Applications, item)
	}

	var srs []models.ServiceRequest
	database.Where("student_id = ? AND deleted_at IS NULL", studentID).Order("created_at desc").Find(&srs)
	resp.ServiceRequests = make([]serviceRequestSum, 0, len(srs))
	for _, sr := range srs {
		item := serviceRequestSum{
			ID: sr.ID, Type: sr.Type, Status: sr.Status, Notes: sr.Notes, Feedback: sr.Feedback,
			ScheduledAt: sr.ScheduledAt, RoomID: sr.RoomID, CreatedAt: sr.CreatedAt,
			StudentID: sr.StudentID, StaffID: sr.StaffID,
		}
		if sr.StaffID != "" {
			var staff models.User
			if database.Where("id = ?", sr.StaffID).First(&staff).Error == nil {
				item.StaffName = staff.FullName
			}
		}
		resp.ServiceRequests = append(resp.ServiceRequests, item)
	}

	respond.OK(w, resp)
}

// ── career service requests ─────────────────────────────────────────────────

type serviceRequestSum struct {
	ID             string     `json:"id"`
	Type           string     `json:"type"`
	Status         string     `json:"status"`
	Notes          string     `json:"notes"`
	Feedback       string     `json:"feedback"`
	ScheduledAt    *time.Time `json:"scheduled_at"`
	RoomID         string     `json:"room_id"`
	CreatedAt      time.Time  `json:"created_at"`
	StudentID      string     `json:"student_id"`
	StudentName    string     `json:"student_name"`
	StudentEmail   string     `json:"student_email"`
	Major          string     `json:"major"`
	GraduationYear int        `json:"graduation_year"`
	ResumeURL      string     `json:"resume_url"`
	StaffID        string     `json:"staff_id"`
	StaffName      string     `json:"staff_name"`
}

var allowedRequestStatuses = map[string]bool{
	"pending": true, "scheduled": true, "completed": true, "declined": true,
}

func staffServiceRequests(w http.ResponseWriter, r *http.Request, staffUserID string) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var reqs []models.ServiceRequest
		database.Where("deleted_at IS NULL").Order("created_at desc").Find(&reqs)

		result := make([]serviceRequestSum, 0, len(reqs))
		for _, sr := range reqs {
			item := serviceRequestSum{
				ID: sr.ID, Type: sr.Type, Status: sr.Status, Notes: sr.Notes, Feedback: sr.Feedback,
				ScheduledAt: sr.ScheduledAt, RoomID: sr.RoomID, CreatedAt: sr.CreatedAt,
				StudentID: sr.StudentID, StaffID: sr.StaffID,
			}
			var student models.User
			if database.Where("id = ?", sr.StudentID).First(&student).Error == nil {
				item.StudentName = student.FullName
				item.StudentEmail = student.Email
				item.Major = student.Major
				item.GraduationYear = student.GraduationYear
				item.ResumeURL = student.ResumeURL
			}
			if sr.StaffID != "" {
				var staff models.User
				if database.Where("id = ?", sr.StaffID).First(&staff).Error == nil {
					item.StaffName = staff.FullName
				}
			}
			result = append(result, item)
		}
		respond.OK(w, map[string]any{"requests": result})

	case http.MethodPut:
		reqID := r.URL.Query().Get("id")
		if reqID == "" {
			respond.Error(w, http.StatusBadRequest, "request id required as ?id=")
			return
		}
		var sr models.ServiceRequest
		if err := database.Where("id = ? AND deleted_at IS NULL", reqID).First(&sr).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "service request not found")
			return
		}

		var req struct {
			Status      *string `json:"status"`
			ScheduledAt *string `json:"scheduled_at"`
			Feedback    *string `json:"feedback"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}

		updates := map[string]any{}
		if req.Status != nil {
			if !allowedRequestStatuses[*req.Status] {
				respond.Error(w, http.StatusBadRequest, "invalid status value")
				return
			}
			updates["status"] = *req.Status
		}
		if req.ScheduledAt != nil {
			t, err := time.Parse(time.RFC3339, *req.ScheduledAt)
			if err != nil {
				respond.Error(w, http.StatusBadRequest, "scheduled_at must be an RFC3339 timestamp")
				return
			}
			updates["scheduled_at"] = t
		}
		if req.Feedback != nil {
			updates["feedback"] = *req.Feedback
		}
		// Claim the request for whichever staff member first acts on it.
		if sr.StaffID == "" {
			updates["staff_id"] = staffUserID
		}
		// Generate a video room once a session is scheduled.
		if sr.RoomID == "" && req.Status != nil && *req.Status == "scheduled" {
			updates["room_id"] = generateRoomID()
		}

		if len(updates) > 0 {
			database.Model(&models.ServiceRequest{}).Where("id = ?", reqID).Updates(updates)
		}

		if req.Status != nil {
			if title, body := serviceStatusNotification(sr.Type, *req.Status); title != "" {
				notify.Create(database, sr.StudentID, staffUserID, "service_request", title, body, "/student/career")
			}
		}

		respond.OK(w, map[string]string{"message": "service request updated"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func serviceStatusNotification(reqType, status string) (string, string) {
	label := map[string]string{
		"mock_interview":  "mock interview",
		"career_advisory": "career advisory session",
		"cv_review":       "CV review",
	}[reqType]
	if label == "" {
		label = "career service request"
	}
	switch status {
	case "scheduled":
		return "Session scheduled", "Your " + label + " has been scheduled. Check Career Center for details."
	case "completed":
		return "Session completed", "Your " + label + " has been marked as completed. Check Career Center for feedback."
	case "declined":
		return "Request declined", "Your " + label + " request was declined."
	default:
		return "", ""
	}
}

func generateRoomID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "svc-" + hex.EncodeToString([]byte(time.Now().Format("150405000000")))
	}
	return "svc-" + hex.EncodeToString(b)
}

// ── data cleanup ─────────────────────────────────────────────────────────────

type cleanupGroup struct {
	Email          string   `json:"email"`
	KeepID         string   `json:"keep_id"`
	KeepName       string   `json:"keep_name"`
	DuplicateIDs   []string `json:"duplicate_ids"`
	DuplicateNames []string `json:"duplicate_names"`
}

type dummyAccount struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

var dummyNameMarkers = []string{"test", "demo", "dummy", "sample", "fake", "lorem", "placeholder", "john doe", "jane doe"}
var dummyEmailDomains = []string{"example.com", "example.org", "test.com", "dummy.com", "mailinator.com"}

func isDummyAccount(u *models.User) bool {
	name := strings.ToLower(strings.TrimSpace(u.FullName))
	email := strings.ToLower(strings.TrimSpace(u.Email))
	for _, marker := range dummyNameMarkers {
		if strings.Contains(name, marker) {
			return true
		}
	}
	for _, domain := range dummyEmailDomains {
		if strings.HasSuffix(email, "@"+domain) {
			return true
		}
	}
	return false
}

// scanForCleanup finds duplicate accounts (same email, keeping the one with
// a real Campus One identity or the oldest record) and accounts that look
// like seed/test data by name or email domain.
func scanForCleanup(database *gorm.DB) ([]cleanupGroup, []dummyAccount) {
	var users []models.User
	database.Where("deleted_at IS NULL").Order("created_at asc").Find(&users)

	byEmail := map[string][]models.User{}
	for _, u := range users {
		key := strings.ToLower(strings.TrimSpace(u.Email))
		if key == "" {
			continue
		}
		byEmail[key] = append(byEmail[key], u)
	}

	dupSet := map[string]bool{}
	groups := make([]cleanupGroup, 0)
	for email, list := range byEmail {
		if len(list) < 2 {
			continue
		}
		keepIdx := 0
		for i, u := range list {
			if u.CampusOneSub != "" {
				keepIdx = i
				break
			}
		}
		keep := list[keepIdx]
		group := cleanupGroup{Email: email, KeepID: keep.ID, KeepName: keep.FullName}
		for i, u := range list {
			if i == keepIdx {
				continue
			}
			group.DuplicateIDs = append(group.DuplicateIDs, u.ID)
			group.DuplicateNames = append(group.DuplicateNames, u.FullName)
			dupSet[u.ID] = true
		}
		groups = append(groups, group)
	}

	dummies := make([]dummyAccount, 0)
	for _, u := range users {
		if dupSet[u.ID] {
			continue
		}
		if isDummyAccount(&u) {
			dummies = append(dummies, dummyAccount{ID: u.ID, Name: u.FullName, Email: u.Email, Role: u.Role})
		}
	}

	return groups, dummies
}

func staffCleanup(w http.ResponseWriter, r *http.Request) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		groups, dummies := scanForCleanup(database)
		dupCount := 0
		for _, g := range groups {
			dupCount += len(g.DuplicateIDs)
		}
		respond.OK(w, map[string]any{
			"duplicate_groups": groups,
			"dummy_accounts":   dummies,
			"duplicate_count":  dupCount,
			"dummy_count":      len(dummies),
		})

	case http.MethodPost:
		groups, dummies := scanForCleanup(database)
		removed := 0
		for _, g := range groups {
			for _, id := range g.DuplicateIDs {
				admin.CascadeDeleteUser(database, id)
				removed++
			}
		}
		for _, d := range dummies {
			admin.CascadeDeleteUser(database, d.ID)
			removed++
		}
		respond.OK(w, map[string]any{"removed": removed, "message": "cleanup complete"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
