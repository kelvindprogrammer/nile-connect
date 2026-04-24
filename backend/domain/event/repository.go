package event

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

func (r *Repository) ListEvents() ([]EventResponse, error) {
	var events []database.Event
	if err := r.db.Where("deleted_at IS NULL").Order("date ASC").Find(&events).Error; err != nil {
		return nil, err
	}
	return toResponses(events), nil
}

func (r *Repository) GetByID(id string) (*EventResponse, error) {
	var ev database.Event
	if err := r.db.Where("id = ?", id).First(&ev).Error; err != nil {
		return nil, err
	}
	resp := toResponse(ev)
	return &resp, nil
}

func (r *Repository) Create(ev *database.Event) (*EventResponse, error) {
	if err := r.db.Create(ev).Error; err != nil {
		return nil, err
	}
	resp := toResponse(*ev)
	return &resp, nil
}

func (r *Repository) Update(id string, updates map[string]interface{}) (*EventResponse, error) {
	if err := r.db.Model(&database.Event{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	return r.GetByID(id)
}

func (r *Repository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&database.Event{}).Error
}

func (r *Repository) Register(eventID, studentID string) error {
	reg := &database.EventRegistration{EventID: eventID, StudentID: studentID}
	if err := r.db.Create(reg).Error; err != nil {
		return err
	}
	return r.db.Model(&database.Event{}).Where("id = ?", eventID).
		UpdateColumn("registrations_count", gorm.Expr("registrations_count + 1")).Error
}

func toResponse(e database.Event) EventResponse {
	return EventResponse{
		ID:                 e.ID,
		OrganiserID:        e.OrganiserID,
		OrganiserType:      string(e.OrganiserType),
		Title:              e.Title,
		Category:           string(e.Category),
		Date:               e.Date,
		Time:               e.Time,
		Location:           e.Location,
		Description:        e.Description,
		Capacity:           e.Capacity,
		RegistrationsCount: e.RegistrationsCount,
		IsFeatured:         e.IsFeatured,
		Status:             string(e.Status),
		CreatedAt:          e.CreatedAt,
	}
}

func toResponses(events []database.Event) []EventResponse {
	result := make([]EventResponse, len(events))
	for i, e := range events {
		result[i] = toResponse(e)
	}
	return result
}
