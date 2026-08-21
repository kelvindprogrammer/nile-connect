// Package eventcat owns the single canonical vocabulary of event categories.
//
// Before this package existed each producer invented its own spelling —
// staff created events as "Career Fair", employers as "career_fair", and the
// student events page filtered on "FAIR". Nothing normalised, so a student
// filtering by category never matched anything a staff member had created.
// Every read and write of Event.Category now goes through Normalize so the
// stored value is always one of Canonical().
package eventcat

import "strings"

// Canonical slugs. These are the only values ever written to events.category.
const (
	CareerFair   = "career_fair"
	Workshop     = "workshop"
	Networking   = "networking"
	Webinar      = "webinar"
	Seminar      = "seminar"
	InfoSession  = "info_session"
	AlumniMeetup = "alumni_meetup"
	Hackathon    = "hackathon"
	TechTalk     = "tech_talk"
	Other        = "other"
)

var canonical = []string{
	CareerFair, Workshop, Networking, Webinar, Seminar,
	InfoSession, AlumniMeetup, Hackathon, TechTalk, Other,
}

var labels = map[string]string{
	CareerFair:   "Career Fair",
	Workshop:     "Workshop",
	Networking:   "Networking",
	Webinar:      "Webinar",
	Seminar:      "Seminar",
	InfoSession:  "Info Session",
	AlumniMeetup: "Alumni Meetup",
	Hackathon:    "Hackathon",
	TechTalk:     "Tech Talk",
	Other:        "Other",
}

// aliases maps historical / shorthand spellings onto canonical slugs. Keys are
// already slugified (lowercase, non-alphanumerics collapsed to "_").
var aliases = map[string]string{
	"fair":            CareerFair,
	"careerfair":      CareerFair,
	"jobfair":         CareerFair,
	"job_fair":        CareerFair,
	"recruitment":     CareerFair,
	"tech":            TechTalk,
	"techtalk":        TechTalk,
	"tech_talks":      TechTalk,
	"talk":            TechTalk,
	"info":            InfoSession,
	"infosession":     InfoSession,
	"information":     InfoSession,
	"alumni":          AlumniMeetup,
	"alumnimeetup":    AlumniMeetup,
	"meetup":          AlumniMeetup,
	"network":         Networking,
	"mixer":           Networking,
	"hack":            Hackathon,
	"hackathons":      Hackathon,
	"workshops":       Workshop,
	"training":        Workshop,
	"bootcamp":        Workshop,
	"webinars":        Webinar,
	"online":          Webinar,
	"seminars":        Seminar,
	"lecture":         Seminar,
	"conference":      Seminar,
	"panel":           Seminar,
	"open_day":        InfoSession,
	"company_visit":   InfoSession,
	"employer_events": Other,
}

// slugify lowercases s and collapses every run of non-alphanumeric characters
// into a single underscore, trimming leading/trailing underscores.
func slugify(s string) string {
	var b strings.Builder
	prevUnderscore := true // suppresses a leading underscore
	for _, r := range strings.ToLower(strings.TrimSpace(s)) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevUnderscore = false
		default:
			if !prevUnderscore {
				b.WriteByte('_')
				prevUnderscore = true
			}
		}
	}
	return strings.TrimSuffix(b.String(), "_")
}

// Normalize maps any inbound category spelling onto a canonical slug.
// An empty or unrecognised value becomes Other, so a category filter can never
// silently drop an event the way the old string comparison did.
func Normalize(raw string) string {
	slug := slugify(raw)
	if slug == "" {
		return Other
	}
	if IsCanonical(slug) {
		return slug
	}
	if mapped, ok := aliases[slug]; ok {
		return mapped
	}
	// "career_fair_2025" and friends — match on a canonical prefix.
	for _, c := range canonical {
		if strings.HasPrefix(slug, c+"_") || strings.HasSuffix(slug, "_"+c) {
			return c
		}
	}
	return Other
}

// IsCanonical reports whether slug is already a canonical category.
func IsCanonical(slug string) bool {
	_, ok := labels[slug]
	return ok
}

// Canonical returns the canonical slugs in display order.
func Canonical() []string {
	out := make([]string, len(canonical))
	copy(out, canonical)
	return out
}

// Label returns the human-readable label for a canonical slug.
func Label(slug string) string {
	if l, ok := labels[slug]; ok {
		return l
	}
	return labels[Other]
}
