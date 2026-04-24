package event

import "time"

type CreateEventRequest struct {
	Title       string    `json:"title"`
	Category    string    `json:"category"`
	Date        time.Time `json:"date"`
	Time        string    `json:"time"`
	Location    string    `json:"location"`
	Description string    `json:"description"`
	Capacity    int       `json:"capacity"`
}

type EventResponse struct {
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
	CreatedAt          time.Time `json:"created_at"`
}
