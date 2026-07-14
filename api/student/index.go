package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/jsonutil"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

var allowedDocumentTypes = map[string]bool{
	"resume":           true,
	"cover_letter":     true,
	"reference_letter": true,
	"transcript":       true,
	"siwes_letter":     true,
	"certification":    true,
	"portfolio":        true,
}

// Handler is the single entrypoint for all /api/student/* routes.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.URL.Query().Get("path") {
	case "profile":
		studentProfile(w, r, auth)
	case "applications":
		studentApplications(w, r, auth)
	case "services":
		studentServices(w, r, auth)
	case "documents":
		studentDocuments(w, r, auth)
	case "application-package":
		studentApplicationPackage(w, r, auth)
	case "application-detail":
		studentApplicationDetail(w, r, auth)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── profile ───────────────────────────────────────────────────────────────────

type profileResp struct {
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	StudentSubtype *string `json:"student_subtype,omitempty"`
	Major          string  `json:"major"`
	GraduationYear int     `json:"graduation_year"`
	GPA            float64 `json:"gpa"`
	IsVerified     bool    `json:"is_verified"`
	ResumeURL      string  `json:"resume_url"`
}

func toProfileResp(u *models.User) profileResp {
	pr := profileResp{
		ID:             u.ID,
		FullName:       u.FullName,
		Username:       u.Username,
		Email:          u.Email,
		Role:           u.Role,
		Major:          u.Major,
		GraduationYear: u.GraduationYear,
		GPA:            u.GPA,
		IsVerified:     u.IsVerified,
		ResumeURL:      u.ResumeURL,
	}
	if u.StudentSubtype != "" {
		st := u.StudentSubtype
		pr.StudentSubtype = &st
	}
	return pr
}

func studentProfile(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var user models.User
		if err := database.Where("id = ? AND deleted_at IS NULL", auth.UserID).First(&user).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "profile not found")
			return
		}
		respond.OK(w, toProfileResp(&user))

	case http.MethodPut:
		var req struct {
			FullName       *string  `json:"full_name"`
			Major          *string  `json:"major"`
			GraduationYear *int     `json:"graduation_year"`
			GPA            *float64 `json:"gpa"`
			ResumeURL      *string  `json:"resume_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updates := map[string]any{}
		if req.FullName != nil {
			updates["full_name"] = *req.FullName
		}
		if req.Major != nil {
			updates["major"] = *req.Major
		}
		if req.GraduationYear != nil {
			updates["graduation_year"] = *req.GraduationYear
		}
		if req.GPA != nil {
			updates["gpa"] = *req.GPA
		}
		if req.ResumeURL != nil {
			updates["resume_url"] = *req.ResumeURL
		}
		if len(updates) > 0 {
			database.Model(&models.User{}).Where("id = ?", auth.UserID).Updates(updates)
		}
		var user models.User
		database.Where("id = ?", auth.UserID).First(&user)
		respond.OK(w, toProfileResp(&user))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── applications ──────────────────────────────────────────────────────────────

type appItem struct {
	ID          string     `json:"id"`
	JobID       string     `json:"job_id"`
	JobTitle    string     `json:"job_title"`
	CompanyName string     `json:"company_name"`
	Status      string     `json:"status"`
	Stage       string     `json:"stage"`
	StageOrder  int        `json:"stage_order"`
	AppliedAt   *time.Time `json:"applied_at"`
	WithdrawnAt *time.Time `json:"withdrawn_at"`
}

func studentApplications(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	var apps []models.Application
	database.Where("student_id = ? AND deleted_at IS NULL", auth.UserID).Find(&apps)

	result := make([]appItem, 0, len(apps))
	for _, a := range apps {
		item := appItem{
			ID: a.ID, JobID: a.JobID, Status: a.Status, Stage: a.Stage,
			StageOrder: a.StageOrder, AppliedAt: a.AppliedAt, WithdrawnAt: a.WithdrawnAt,
		}
		var job models.Job
		if database.Where("id = ?", a.JobID).First(&job).Error == nil {
			item.JobTitle = job.Title
			var emp models.EmployerProfile
			if database.Where("user_id = ?", job.EmployerID).First(&emp).Error == nil {
				item.CompanyName = emp.CompanyName
			}
		}
		result = append(result, item)
	}
	respond.OK(w, map[string]any{"applications": result})
}

// ── career services ──────────────────────────────────────────────────────────

var allowedServiceTypes = map[string]bool{
	"mock_interview":  true,
	"career_advisory": true,
	"cv_review":       true,
}

type serviceRequestItem struct {
	ID          string     `json:"id"`
	Type        string     `json:"type"`
	Status      string     `json:"status"`
	Notes       string     `json:"notes"`
	Feedback    string     `json:"feedback"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	RoomID      string     `json:"room_id"`
	StaffName   string     `json:"staff_name"`
	CreatedAt   time.Time  `json:"created_at"`
}

func studentServices(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var reqs []models.ServiceRequest
		database.Where("student_id = ? AND deleted_at IS NULL", auth.UserID).Order("created_at desc").Find(&reqs)

		result := make([]serviceRequestItem, 0, len(reqs))
		for _, sr := range reqs {
			item := serviceRequestItem{
				ID: sr.ID, Type: sr.Type, Status: sr.Status, Notes: sr.Notes,
				Feedback: sr.Feedback, ScheduledAt: sr.ScheduledAt, RoomID: sr.RoomID,
				CreatedAt: sr.CreatedAt,
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

	case http.MethodPost:
		var req struct {
			Type  string `json:"type"`
			Notes string `json:"notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if !allowedServiceTypes[req.Type] {
			respond.Error(w, http.StatusBadRequest, "invalid service type")
			return
		}
		sr := models.ServiceRequest{
			StudentID: auth.UserID,
			Type:      req.Type,
			Status:    "pending",
			Notes:     req.Notes,
		}
		if err := database.Create(&sr).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create request")
			return
		}
		respond.Created(w, map[string]any{
			"id":      sr.ID,
			"status":  sr.Status,
			"message": "Request submitted successfully",
		})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── documents ─────────────────────────────────────────────────────────────────

type documentItem struct {
	ID          string     `json:"id"`
	Type        string     `json:"type"`
	Title       string     `json:"title"`
	FileURL     string     `json:"file_url"`
	FileName    string     `json:"file_name"`
	RefereeType string     `json:"referee_type,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	IsDefault   bool       `json:"is_default"`
	CreatedAt   time.Time  `json:"created_at"`
}

func toDocumentItem(d *models.Document) documentItem {
	return documentItem{
		ID: d.ID, Type: d.Type, Title: d.Title, FileURL: d.FileURL, FileName: d.FileName,
		RefereeType: d.RefereeType, ExpiresAt: d.ExpiresAt, IsDefault: d.IsDefault, CreatedAt: d.CreatedAt,
	}
}

func studentDocuments(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var docs []models.Document
		database.Where("user_id = ? AND deleted_at IS NULL", auth.UserID).Order("created_at desc").Find(&docs)
		result := make([]documentItem, 0, len(docs))
		for _, d := range docs {
			result = append(result, toDocumentItem(&d))
		}
		respond.OK(w, map[string]any{"documents": result})

	case http.MethodPost:
		var req struct {
			Type        string     `json:"type"`
			Title       string     `json:"title"`
			FileURL     string     `json:"file_url"`
			FileName    string     `json:"file_name"`
			RefereeType string     `json:"referee_type"`
			ExpiresAt   *time.Time `json:"expires_at"`
			IsDefault   bool       `json:"is_default"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if !allowedDocumentTypes[req.Type] {
			respond.Error(w, http.StatusBadRequest, "invalid document type")
			return
		}
		if req.FileURL == "" || req.Title == "" {
			respond.Error(w, http.StatusBadRequest, "title and file_url are required")
			return
		}
		if req.IsDefault {
			database.Model(&models.Document{}).
				Where("user_id = ? AND type = ?", auth.UserID, req.Type).
				Update("is_default", false)
		}
		doc := models.Document{
			UserID: auth.UserID, Type: req.Type, Title: req.Title, FileURL: req.FileURL,
			FileName: req.FileName, RefereeType: req.RefereeType, ExpiresAt: req.ExpiresAt, IsDefault: req.IsDefault,
		}
		if err := database.Create(&doc).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not save document")
			return
		}
		respond.Created(w, toDocumentItem(&doc))

	case http.MethodPut:
		id := r.URL.Query().Get("id")
		if id == "" {
			respond.Error(w, http.StatusBadRequest, "id is required")
			return
		}
		var doc models.Document
		if err := database.Where("id = ? AND user_id = ?", id, auth.UserID).First(&doc).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "document not found")
			return
		}
		var req struct {
			Title       *string    `json:"title"`
			ExpiresAt   *time.Time `json:"expires_at"`
			IsDefault   *bool      `json:"is_default"`
			RefereeType *string    `json:"referee_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updates := map[string]any{}
		if req.Title != nil {
			updates["title"] = *req.Title
		}
		if req.ExpiresAt != nil {
			updates["expires_at"] = *req.ExpiresAt
		}
		if req.RefereeType != nil {
			updates["referee_type"] = *req.RefereeType
		}
		if req.IsDefault != nil {
			if *req.IsDefault {
				database.Model(&models.Document{}).
					Where("user_id = ? AND type = ?", auth.UserID, doc.Type).
					Update("is_default", false)
			}
			updates["is_default"] = *req.IsDefault
		}
		if len(updates) > 0 {
			database.Model(&models.Document{}).Where("id = ?", id).Updates(updates)
		}
		database.Where("id = ?", id).First(&doc)
		respond.OK(w, toDocumentItem(&doc))

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			respond.Error(w, http.StatusBadRequest, "id is required")
			return
		}
		res := database.Where("id = ? AND user_id = ?", id, auth.UserID).Delete(&models.Document{})
		if res.RowsAffected == 0 {
			respond.Error(w, http.StatusNotFound, "document not found")
			return
		}
		respond.OK(w, map[string]any{"deleted": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── application package builder ──────────────────────────────────────────────

func studentApplicationPackage(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		respond.Error(w, http.StatusBadRequest, "job_id is required")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}
	var job models.Job
	if err := database.Where("id = ? AND deleted_at IS NULL", jobID).First(&job).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "job not found")
		return
	}
	required := jsonutil.StringSlice(job.RequiredDocs)
	optional := jsonutil.StringSlice(job.OptionalDocs)

	var docs []models.Document
	database.Where("user_id = ? AND deleted_at IS NULL", auth.UserID).Order("created_at desc").Find(&docs)
	byType := map[string][]documentItem{}
	for _, d := range docs {
		byType[d.Type] = append(byType[d.Type], toDocumentItem(&d))
	}

	respond.OK(w, map[string]any{
		"job_id":            job.ID,
		"required_docs":     required,
		"optional_docs":     optional,
		"documents_by_type": byType,
	})
}

// ── application detail (student view) ────────────────────────────────────────

func studentApplicationDetail(w http.ResponseWriter, r *http.Request, auth *mw.AuthCtx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}
	var app models.Application
	if err := database.Where("id = ? AND student_id = ? AND deleted_at IS NULL", id, auth.UserID).First(&app).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "application not found")
		return
	}
	var job models.Job
	database.Where("id = ?", app.JobID).First(&job)
	var emp models.EmployerProfile
	database.Where("user_id = ?", job.EmployerID).First(&emp)

	var history []models.ApplicationStageHistory
	database.Where("application_id = ?", app.ID).Order("created_at asc").Find(&history)
	historyOut := make([]map[string]any, 0, len(history))
	for _, h := range history {
		historyOut = append(historyOut, map[string]any{
			"from_stage": h.FromStage, "to_stage": h.ToStage, "note": h.Note, "created_at": h.CreatedAt,
		})
	}

	docIDs := jsonutil.StringSlice(app.DocumentIDs)
	var docs []models.Document
	if len(docIDs) > 0 {
		database.Where("id IN ?", docIDs).Find(&docs)
	}
	docsOut := make([]documentItem, 0, len(docs))
	for _, d := range docs {
		docsOut = append(docsOut, toDocumentItem(&d))
	}

	respond.OK(w, map[string]any{
		"id": app.ID, "job_id": app.JobID, "job_title": job.Title, "company_name": emp.CompanyName,
		"status": app.Status, "stage": app.Stage, "applied_at": app.AppliedAt, "withdrawn_at": app.WithdrawnAt,
		"cover_letter": app.CoverLetter, "documents": docsOut, "history": historyOut,
	})
}
