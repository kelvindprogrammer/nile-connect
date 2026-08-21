package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/email"
	"nile-connect/lib/eventcat"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/notify"
	"nile-connect/lib/respond"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type eventResponse struct {
	ID                 string    `json:"id"`
	OrganiserID        string    `json:"organiser_id"`
	OrganiserType      string    `json:"organiser_type"`
	Title              string    `json:"title"`
	Category           string    `json:"category"`
	CategoryLabel      string    `json:"category_label"`
	Date               time.Time `json:"date"`
	Time               string    `json:"time"`
	Location           string    `json:"location"`
	Description        string    `json:"description"`
	Capacity           int       `json:"capacity"`
	RegistrationsCount int       `json:"registrations_count"`
	IsFeatured         bool      `json:"is_featured"`
	Status             string    `json:"status"`
	SuggestedBy        string    `json:"suggested_by,omitempty"`
	// IsRegistered reflects the *calling* user's registration state. It is the
	// server's answer, not a client-side guess — the old page kept this in a
	// React Set that vanished on refresh.
	IsRegistered bool `json:"is_registered"`
	IsFull       bool `json:"is_full"`
	IsPast       bool `json:"is_past"`
}

type categoryOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
	Count int    `json:"count"`
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

// liveRole fetches the user's real role from the database, bypassing JWT claims.
func liveRole(database *gorm.DB, userID string) string {
	var u models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", userID).First(&u).Error; err != nil {
		return ""
	}
	return u.Role
}

// resolveRole returns the caller's live DB role, falling back to the JWT claim
// only when the row cannot be read.
func resolveRole(database *gorm.DB, auth *mw.AuthCtx) string {
	if role := liveRole(database, auth.UserID); role != "" {
		return role
	}
	return auth.Role
}

// optionalAuth resolves the caller if a valid session is present, and returns
// nil otherwise. The events list is readable without a session, but a signed-in
// caller additionally gets their own is_registered flags.
func optionalAuth(r *http.Request) *mw.AuthCtx {
	auth, err := mw.Auth(r)
	if err != nil {
		return nil
	}
	return auth
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

	// Sub-actions are routed by ?path=, matching the convention used by every
	// other handler in this repo. An absent path keeps the original
	// method-dispatched CRUD behaviour for events themselves.
	switch r.URL.Query().Get("path") {
	case "register":
		eventRegister(w, r, database)
		return
	case "suggest":
		eventSuggest(w, r, database)
		return
	case "categories":
		eventCategories(w, r, database)
		return
	}

	switch r.Method {
	case http.MethodDelete:
		deleteEvent(w, r, database)
	case http.MethodPut:
		updateEvent(w, r, database)
	case http.MethodGet:
		listEvents(w, r, database)
	case http.MethodPost:
		createEvent(w, r, database)
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── list ──────────────────────────────────────────────────────────────────────

// listEvents returns the events visible to the caller.
//
// Visibility rules (previously missing entirely — every caller saw every row,
// including unreviewed suggestions and cancelled events):
//   - staff see everything, they are the reviewers;
//   - employers see published events plus their own drafts;
//   - students see published events plus anything they suggested;
//   - anonymous callers see only published events.
//
// ?category=<slug> filters server-side; ?upcoming=1 drops events already past.
func listEvents(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth := optionalAuth(r)
	role := ""
	userID := ""
	if auth != nil {
		role = resolveRole(database, auth)
		userID = auth.UserID
	}

	q := database.Model(&models.Event{}).Where("deleted_at IS NULL")

	switch {
	case role == "staff":
		// no additional filter — staff review the whole queue
	case role == "employer":
		q = q.Where("(status = ? OR organiser_id = ?)", "published", userID)
	case userID != "":
		// A student's own suggestion must not silently disappear after
		// submission, so it stays visible to them while pending.
		q = q.Where("(status = ? OR suggested_by = ?)", "published", userID)
	default:
		q = q.Where("status = ?", "published")
	}

	if raw := r.URL.Query().Get("category"); raw != "" && !strings.EqualFold(raw, "all") {
		q = q.Where("category = ?", eventcat.Normalize(raw))
	}
	if r.URL.Query().Get("upcoming") == "1" {
		q = q.Where("date >= ?", startOfToday())
	}

	var events []models.Event
	if err := q.Order("date asc").Find(&events).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not fetch events")
		return
	}

	registered := registeredEventIDs(database, userID, events)

	result := make([]eventResponse, 0, len(events))
	counts := map[string]int{}
	for i := range events {
		e := &events[i]
		result = append(result, toEventResponse(e, registered[e.ID]))
		if e.Status == "published" {
			counts[eventcat.Normalize(e.Category)]++
		}
	}

	// Category tabs are derived from the data the caller can actually see, so
	// a tab can never render an empty list the way the old hardcoded
	// ALL/TECH/WORKSHOP/FAIR/WEBINAR/SEMINAR strip did.
	categories := make([]categoryOption, 0, len(counts))
	for _, slug := range eventcat.Canonical() {
		if counts[slug] == 0 {
			continue
		}
		categories = append(categories, categoryOption{Value: slug, Label: eventcat.Label(slug), Count: counts[slug]})
	}

	respond.OK(w, map[string]any{"events": result, "categories": categories})
}

// eventCategories exposes the canonical vocabulary so create/suggest forms in
// every client build their options from one list instead of three divergent
// hardcoded ones.
func eventCategories(w http.ResponseWriter, r *http.Request, _ *gorm.DB) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	out := make([]categoryOption, 0)
	for _, slug := range eventcat.Canonical() {
		out = append(out, categoryOption{Value: slug, Label: eventcat.Label(slug)})
	}
	respond.OK(w, map[string]any{"categories": out})
}

// registeredEventIDs returns the subset of the given events that userID has
// registered for, in a single query rather than one per card.
func registeredEventIDs(database *gorm.DB, userID string, events []models.Event) map[string]bool {
	out := map[string]bool{}
	if userID == "" || len(events) == 0 {
		return out
	}
	ids := make([]string, 0, len(events))
	for i := range events {
		ids = append(ids, events[i].ID)
	}
	var regs []models.EventRegistration
	if err := database.Where("student_id = ? AND event_id IN ? AND deleted_at IS NULL", userID, ids).
		Find(&regs).Error; err != nil {
		return out
	}
	for i := range regs {
		out[regs[i].EventID] = true
	}
	return out
}

// ── register / unregister ─────────────────────────────────────────────────────

// eventRegister persists an event registration. The old implementation was a
// client-side Set toggle: nothing was written, registrations_count never
// moved, and the state was lost on refresh. Registration now lives in
// event_registrations, guarded by a unique index, with an eligibility check
// and a confirmation email naming the event.
func eventRegister(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	eventID := r.URL.Query().Get("id")
	if eventID == "" {
		respond.Error(w, http.StatusBadRequest, "event id required as ?id=")
		return
	}

	var event models.Event
	if err := database.Where("id = ? AND deleted_at IS NULL", eventID).First(&event).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "event not found")
		return
	}

	switch r.Method {
	case http.MethodPost:
		if event.Status != "published" {
			respond.Error(w, http.StatusConflict, "this event is not open for registration yet")
			return
		}
		if !event.Date.IsZero() && event.Date.Before(startOfToday()) {
			respond.Error(w, http.StatusConflict, "this event has already taken place")
			return
		}

		created := false
		txErr := database.Transaction(func(tx *gorm.DB) error {
			// ON CONFLICT DO NOTHING against the unique (event_id, student_id)
			// index makes a double-clicked Register idempotent instead of
			// inserting a duplicate and double-counting the event.
			res := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "event_id"}, {Name: "student_id"}},
				DoNothing: true,
			}).Create(&models.EventRegistration{
				EventID:      eventID,
				StudentID:    auth.UserID,
				RegisteredAt: time.Now(),
			})
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return nil // already registered — a no-op, not an error
			}
			created = true

			// Recount rather than increment so the stored counter can never
			// drift away from the rows that back it.
			return recountRegistrations(tx, eventID)
		})
		if txErr != nil {
			respond.Error(w, http.StatusInternalServerError, "could not complete registration")
			return
		}

		// Re-read so the client renders the authoritative count.
		database.Where("id = ?", eventID).First(&event)

		if created {
			// Capacity is advisory (waitlist behaviour): the place is still
			// recorded, and both parties are told either way.
			sendRegistrationConfirmation(database, auth.UserID, &event)
			notifyOrganiserOfRegistration(database, auth.UserID, &event)
		}

		respond.OK(w, map[string]any{
			"registered": true,
			"already":    !created,
			"event":      toEventResponse(&event, true),
			"message":    "You are registered for " + event.Title + ".",
		})

	case http.MethodDelete:
		txErr := database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Unscoped().
				Where("event_id = ? AND student_id = ?", eventID, auth.UserID).
				Delete(&models.EventRegistration{}).Error; err != nil {
				return err
			}
			return recountRegistrations(tx, eventID)
		})
		if txErr != nil {
			respond.Error(w, http.StatusInternalServerError, "could not cancel registration")
			return
		}
		database.Where("id = ?", eventID).First(&event)
		respond.OK(w, map[string]any{
			"registered": false,
			"event":      toEventResponse(&event, false),
			"message":    "Your registration for " + event.Title + " was cancelled.",
		})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// recountRegistrations recomputes events.registrations_count from the
// registration rows themselves.
func recountRegistrations(tx *gorm.DB, eventID string) error {
	return tx.Exec(`UPDATE events SET registrations_count = (
			SELECT COUNT(*) FROM event_registrations
			WHERE event_id = ? AND deleted_at IS NULL
		) WHERE id = ?`, eventID, eventID).Error
}

func sendRegistrationConfirmation(database *gorm.DB, userID string, event *models.Event) {
	var user models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error; err != nil {
		return
	}
	// notify.Create no-ops when actor == recipient, so the in-app record is
	// written directly here and the email sent alongside it.
	database.Create(&models.Notification{
		UserID: userID,
		Type:   "event_registration",
		Title:  "Registered: " + event.Title,
		Body:   "You are on the list for " + event.Title + " on " + formatEventDate(event) + ".",
		Link:   "/student/events",
	})
	if user.Email == "" {
		return
	}
	subject, html := email.EventRegistrationTemplate(
		user.FullName, event.Title, formatEventDate(event), event.Time, event.Location)
	email.Send(user.Email, subject, html)
}

func notifyOrganiserOfRegistration(database *gorm.DB, studentID string, event *models.Event) {
	var student models.User
	if err := database.Where("id = ?", studentID).First(&student).Error; err != nil {
		return
	}
	notify.Create(database, event.OrganiserID, studentID, "event_registration",
		"New registration: "+event.Title,
		student.FullName+" registered for "+event.Title+".",
		"/"+organiserPortal(event.OrganiserType)+"/events")
}

func organiserPortal(organiserType string) string {
	if organiserType == "employer" {
		return "employer"
	}
	return "staff"
}

// ── suggest ───────────────────────────────────────────────────────────────────

// eventSuggest lets a student propose an event. It lands as a pending row with
// suggested_by set, so it appears in the staff review queue and in the
// suggesting student's own list, but nowhere else until staff publish it.
func eventSuggest(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Location = strings.TrimSpace(req.Location)
	req.Description = strings.TrimSpace(req.Description)
	if req.Title == "" || req.Location == "" || req.Description == "" {
		respond.Error(w, http.StatusBadRequest, "title, location and description are required")
		return
	}
	if req.Capacity <= 0 {
		req.Capacity = 50 // suggestions are indicative; staff set the real number
	}

	role := resolveRole(database, auth)
	event := models.Event{
		OrganiserID:   auth.UserID,
		OrganiserType: role,
		SuggestedBy:   auth.UserID,
		Title:         req.Title,
		Category:      eventcat.Normalize(req.Category),
		Date:          req.Date,
		Time:          strings.TrimSpace(req.Time),
		Location:      req.Location,
		Description:   req.Description,
		Capacity:      req.Capacity,
		Status:        "pending",
	}
	if err := database.Create(&event).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not submit suggestion")
		return
	}

	notifyStaffOfSuggestion(database, auth.UserID, &event)

	respond.Created(w, map[string]any{
		"event":   toEventResponse(&event, false),
		"message": "Thanks — " + event.Title + " was sent to Career Services for review.",
	})
}

func notifyStaffOfSuggestion(database *gorm.DB, actorID string, event *models.Event) {
	var suggester models.User
	database.Where("id = ?", actorID).First(&suggester)

	var staff []models.User
	if err := database.Where("role = ? AND deleted_at IS NULL", "staff").Find(&staff).Error; err != nil {
		return
	}
	name := suggester.FullName
	if name == "" {
		name = "A student"
	}
	title, when, where := event.Title, formatEventDate(event), event.Location
	for i := range staff {
		notify.CreateAndEmail(database, staff[i].ID, actorID, "event_suggested",
			"Event suggested: "+title,
			name+" suggested a new event for review.",
			"/staff/events",
			func() (string, string) { return email.EventSuggestedTemplate(name, title, when, where) })
	}
}

// ── create / update / delete ──────────────────────────────────────────────────

func createEvent(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	role := resolveRole(database, auth)
	if role != "staff" && role != "employer" {
		respond.Error(w, http.StatusForbidden, "only staff and employers can create events")
		return
	}
	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Location = strings.TrimSpace(req.Location)
	req.Description = strings.TrimSpace(req.Description)
	if req.Title == "" || req.Category == "" || req.Location == "" || req.Description == "" || req.Capacity <= 0 {
		respond.Error(w, http.StatusBadRequest, "title, category, location, description and capacity are required")
		return
	}

	// Staff-created events go live immediately; employer events wait for staff
	// review, mirroring how employer job postings are gated.
	status := "pending"
	if role == "staff" {
		status = "published"
	}

	event := models.Event{
		OrganiserID:   auth.UserID,
		OrganiserType: role,
		Title:         req.Title,
		Category:      eventcat.Normalize(req.Category),
		Date:          req.Date,
		Time:          strings.TrimSpace(req.Time),
		Location:      req.Location,
		Description:   req.Description,
		Capacity:      req.Capacity,
		Status:        status,
	}
	if err := database.Create(&event).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create event")
		return
	}
	if role == "employer" {
		notifyStaffOfSuggestion(database, auth.UserID, &event)
	}
	respond.Created(w, toEventResponse(&event, false))
}

func updateEvent(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if resolveRole(database, auth) != "staff" {
		respond.Error(w, http.StatusForbidden, "staff access required")
		return
	}
	eventID := r.URL.Query().Get("id")
	if eventID == "" {
		respond.Error(w, http.StatusBadRequest, "event id required as ?id=")
		return
	}
	var req struct {
		Status     *string `json:"status"`
		IsFeatured *bool   `json:"is_featured"`
		Category   *string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var event models.Event
	if err := database.Where("id = ? AND deleted_at IS NULL", eventID).First(&event).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "event not found")
		return
	}

	updates := map[string]any{}
	newStatus := ""
	if req.Status != nil {
		allowed := map[string]bool{"pending": true, "published": true, "cancelled": true}
		if !allowed[*req.Status] {
			respond.Error(w, http.StatusBadRequest, "invalid status")
			return
		}
		updates["status"] = *req.Status
		newStatus = *req.Status
		updates["reviewed_by"] = auth.UserID
		updates["reviewed_at"] = time.Now()
	}
	if req.IsFeatured != nil {
		if *req.IsFeatured {
			// Only one event can be the featured hero on the events page;
			// promoting one demotes the rest instead of the page rendering
			// whichever row the query happened to return first.
			database.Model(&models.Event{}).
				Where("id <> ? AND is_featured = ?", eventID, true).
				Update("is_featured", false)
		}
		updates["is_featured"] = *req.IsFeatured
	}
	if req.Category != nil {
		updates["category"] = eventcat.Normalize(*req.Category)
	}
	if len(updates) > 0 {
		if err := database.Model(&models.Event{}).Where("id = ?", eventID).Updates(updates).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not update event")
			return
		}
	}

	// Tell the proposer/organiser what happened to their submission.
	if newStatus != "" && event.Status != newStatus {
		recipient := event.SuggestedBy
		if recipient == "" {
			recipient = event.OrganiserID
		}
		title, when := event.Title, formatEventDate(&event)
		switch newStatus {
		case "published":
			notify.CreateAndEmail(database, recipient, auth.UserID, "event_published",
				"Event approved: "+title,
				title+" is now live on the events calendar.",
				"/student/events",
				func() (string, string) { return email.EventApprovedTemplate(title, when) })
		case "cancelled":
			notify.CreateAndEmail(database, recipient, auth.UserID, "event_cancelled",
				"Event cancelled: "+title,
				title+" was cancelled by Career Services.",
				"/student/events",
				func() (string, string) { return email.EventCancelledTemplate(title) })
			notifyRegistrantsOfCancellation(database, auth.UserID, &event)
		}
	}

	respond.OK(w, map[string]string{"message": "event updated"})
}

// notifyRegistrantsOfCancellation tells everyone holding a place that the
// event is off — previously a cancelled event simply vanished from the list
// with no word to the people who had registered.
func notifyRegistrantsOfCancellation(database *gorm.DB, actorID string, event *models.Event) {
	var regs []models.EventRegistration
	if err := database.Where("event_id = ? AND deleted_at IS NULL", event.ID).Find(&regs).Error; err != nil {
		return
	}
	title, when := event.Title, formatEventDate(event)
	for i := range regs {
		notify.CreateAndEmail(database, regs[i].StudentID, actorID, "event_cancelled",
			"Event cancelled: "+title,
			title+" on "+when+" has been cancelled.",
			"/student/events",
			func() (string, string) { return email.EventCancelledTemplate(title) })
	}
}

func deleteEvent(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if resolveRole(database, auth) != "staff" {
		respond.Error(w, http.StatusForbidden, "staff access required")
		return
	}
	eventID := r.URL.Query().Get("id")
	if eventID == "" {
		respond.Error(w, http.StatusBadRequest, "event id required as ?id=")
		return
	}
	err = database.Transaction(func(tx *gorm.DB) error {
		// Registrations are meaningless once the event is gone; leaving them
		// behind would keep the row in every student's registered set. Hard
		// deleted, like the cancel path, so no tombstone is left sitting under
		// the unique (event_id, student_id) index.
		if err := tx.Unscoped().Where("event_id = ?", eventID).Delete(&models.EventRegistration{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", eventID).Delete(&models.Event{}).Error
	})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		respond.Error(w, http.StatusInternalServerError, "could not delete event")
		return
	}
	respond.OK(w, map[string]string{"message": "event deleted"})
}

// ── helpers ───────────────────────────────────────────────────────────────────

func startOfToday() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
}

func formatEventDate(e *models.Event) string {
	if e.Date.IsZero() {
		return "a date to be announced"
	}
	return e.Date.Format("Mon 2 Jan 2006")
}

func toEventResponse(e *models.Event, isRegistered bool) eventResponse {
	slug := eventcat.Normalize(e.Category)
	return eventResponse{
		ID:                 e.ID,
		OrganiserID:        e.OrganiserID,
		OrganiserType:      e.OrganiserType,
		Title:              e.Title,
		Category:           slug,
		CategoryLabel:      eventcat.Label(slug),
		Date:               e.Date,
		Time:               e.Time,
		Location:           e.Location,
		Description:        e.Description,
		Capacity:           e.Capacity,
		RegistrationsCount: e.RegistrationsCount,
		IsFeatured:         e.IsFeatured,
		Status:             e.Status,
		SuggestedBy:        e.SuggestedBy,
		IsRegistered:       isRegistered,
		IsFull:             e.Capacity > 0 && e.RegistrationsCount >= e.Capacity,
		IsPast:             !e.Date.IsZero() && e.Date.Before(startOfToday()),
	}
}
