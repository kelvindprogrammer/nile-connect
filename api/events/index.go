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

type eventResponse struct {
	ID                 string    `json:"id"`
	OrganiserID        string    `json:"organiser_id"`
	OrganiserType      string    `json:"organiser_type"`
	Title              string    `json:"title"`
	Category           string    `json:"category"`
	Date               time.Time `json:"date"`
	Time               string    `json:"time"`
	Location           string    `json:"location"`
	Description        string    `json:"description"`
	Capacity           int       `json:"capacity"`
	RegistrationsCount int       `json:"registrations_count"`
	IsFeatured         bool      `json:"is_featured"`
	Status             string    `json:"status"`
}

type createEventRequest struct {
	Title       string    `json:"title"`
	Category    string    `json:"category"`
	Date        time.Time `json:"date"`
	Time        string    `json:"time"`
	Location    string    `json:"location"`
	Description string    `json:"description"`
	Capacity    int       `json:"capacity"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var events []models.Event
		if err := database.Where("deleted_at IS NULL").Order("date asc").Find(&events).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch events")
			return
		}
		result := make([]eventResponse, 0, len(events))
		for _, e := range events {
			result = append(result, toEventResponse(&e))
		}
		respond.OK(w, map[string]any{"events": result})

	case http.MethodPost:
		auth, err := mw.Auth(r)
		if err != nil {
			respond.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}
		if auth.Role != "staff" && auth.Role != "employer" {
			respond.Error(w, http.StatusForbidden, "only staff and employers can create events")
			return
		}
		var req createEventRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Title == "" || req.Category == "" || req.Location == "" || req.Description == "" || req.Capacity == 0 {
			respond.Error(w, http.StatusBadRequest, "title, category, location, description and capacity are required")
			return
		}
		event := models.Event{
			OrganiserID:   auth.UserID,
			OrganiserType: auth.Role,
			Title:         req.Title,
			Category:      req.Category,
			Date:          req.Date,
			Time:          req.Time,
			Location:      req.Location,
			Description:   req.Description,
			Capacity:      req.Capacity,
			Status:        "pending",
		}
		if err := database.Create(&event).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create event")
			return
		}
		respond.Created(w, toEventResponse(&event))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func toEventResponse(e *models.Event) eventResponse {
	return eventResponse{
		ID:                 e.ID,
		OrganiserID:        e.OrganiserID,
		OrganiserType:      e.OrganiserType,
		Title:              e.Title,
		Category:           e.Category,
		Date:               e.Date,
		Time:               e.Time,
		Location:           e.Location,
		Description:        e.Description,
		Capacity:           e.Capacity,
		RegistrationsCount: e.RegistrationsCount,
		IsFeatured:         e.IsFeatured,
		Status:             e.Status,
	}
}
