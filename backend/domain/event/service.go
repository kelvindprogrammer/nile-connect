package event

import (
	"errors"

	"github.com/nile-connect/backend/internal/database"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListEvents() ([]EventResponse, error) {
	return s.repo.ListEvents()
}

func (s *Service) GetEvent(id string) (*EventResponse, error) {
	return s.repo.GetByID(id)
}

func (s *Service) CreateEvent(organiserID, organiserType string, req *CreateEventRequest) (*EventResponse, error) {
	if req.Title == "" || req.Location == "" || req.Description == "" || req.Capacity <= 0 {
		return nil, errors.New("title, location, description and capacity are required")
	}
	ev := &database.Event{
		OrganiserID:   organiserID,
		OrganiserType: database.Role(organiserType),
		Title:         req.Title,
		Category:      database.EventCategory(req.Category),
		Date:          req.Date,
		Time:          req.Time,
		Location:      req.Location,
		Description:   req.Description,
		Capacity:      req.Capacity,
		Status:        database.JobStatusActive,
	}
	return s.repo.Create(ev)
}

func (s *Service) UpdateEvent(id string, req *CreateEventRequest) (*EventResponse, error) {
	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Location != "" {
		updates["location"] = req.Location
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Capacity > 0 {
		updates["capacity"] = req.Capacity
	}
	if len(updates) == 0 {
		return nil, errors.New("no fields to update")
	}
	return s.repo.Update(id, updates)
}

func (s *Service) DeleteEvent(id string) error {
	return s.repo.Delete(id)
}

func (s *Service) RegisterForEvent(eventID, studentID string) error {
	return s.repo.Register(eventID, studentID)
}
