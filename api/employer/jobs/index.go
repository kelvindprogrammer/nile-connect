package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type jobResponse struct {
	ID             string    `json:"id"`
	EmployerID     string    `json:"employer_id"`
	Title          string    `json:"title"`
	Type           string    `json:"type"`
	Location       string    `json:"location"`
	Salary         string    `json:"salary"`
	Description    string    `json:"description"`
	Requirements   string    `json:"requirements"`
	Skills         string    `json:"skills"`
	Deadline       time.Time `json:"deadline"`
	Status         string    `json:"status"`
	ApplicantCount int       `json:"applicant_count"`
	PostedAt       time.Time `json:"posted_at"`
}

type jobPostRequest struct {
	Title        string    `json:"title"`
	Type         string    `json:"type"`
	Location     string    `json:"location"`
	Salary       string    `json:"salary"`
	Description  string    `json:"description"`
	Requirements string    `json:"requirements"`
	Skills       string    `json:"skills"`
	Deadline     time.Time `json:"deadline"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}

	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if auth.Role != "employer" {
		respond.Error(w, http.StatusForbidden, "employer access required")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var jobs []models.Job
		if err := database.Where("employer_id = ? AND deleted_at IS NULL", auth.UserID).Order("created_at desc").Find(&jobs).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch jobs")
			return
		}
		result := make([]jobResponse, 0, len(jobs))
		for _, j := range jobs {
			result = append(result, toJobResponse(&j))
		}
		respond.OK(w, map[string]any{"jobs": result})

	case http.MethodPost:
		var req jobPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Title == "" || req.Type == "" || req.Location == "" || req.Description == "" || req.Requirements == "" {
			respond.Error(w, http.StatusBadRequest, "title, type, location, description and requirements are required")
			return
		}
		job := models.Job{
			EmployerID:   auth.UserID,
			Title:        req.Title,
			Type:         req.Type,
			Location:     req.Location,
			Salary:       req.Salary,
			Description:  req.Description,
			Requirements: req.Requirements,
			Skills:       req.Skills,
			Deadline:     req.Deadline,
			Status:       "pending",
		}
		if err := database.Create(&job).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create job")
			return
		}
		respond.Created(w, toJobResponse(&job))

	case http.MethodPut:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as query param ?id=")
			return
		}
		var req jobPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updates := map[string]any{
			"title":        req.Title,
			"type":         req.Type,
			"location":     req.Location,
			"salary":       req.Salary,
			"description":  req.Description,
			"requirements": req.Requirements,
			"skills":       req.Skills,
			"deadline":     req.Deadline,
		}
		if err := database.Model(&models.Job{}).Where("id = ? AND employer_id = ?", jobID, auth.UserID).Updates(updates).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update job")
			return
		}
		var job models.Job
		database.Where("id = ?", jobID).First(&job)
		respond.OK(w, toJobResponse(&job))

	case http.MethodDelete:
		jobID := r.URL.Query().Get("id")
		if jobID == "" {
			respond.Error(w, http.StatusBadRequest, "job id required as query param ?id=")
			return
		}
		if err := database.Where("id = ? AND employer_id = ?", jobID, auth.UserID).Delete(&models.Job{}).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not delete job")
			return
		}
		respond.OK(w, map[string]string{"message": "job deleted"})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func toJobResponse(j *models.Job) jobResponse {
	return jobResponse{
		ID:             j.ID,
		EmployerID:     j.EmployerID,
		Title:          j.Title,
		Type:           j.Type,
		Location:       j.Location,
		Salary:         j.Salary,
		Description:    j.Description,
		Requirements:   j.Requirements,
		Skills:         j.Skills,
		Deadline:       j.Deadline,
		Status:         j.Status,
		ApplicantCount: j.ApplicantCount,
		PostedAt:       j.CreatedAt,
	}
}
