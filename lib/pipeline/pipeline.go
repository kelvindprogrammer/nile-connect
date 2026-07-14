// Package pipeline defines the shared application-stage enum and its
// mapping onto the legacy Application.Status field, used by both the jobs
// and employer serverless handlers.
package pipeline

var AllowedStages = map[string]bool{
	"submitted": true, "under_review": true, "shortlisted": true,
	"interview_scheduled": true, "assessment_sent": true, "offer_extended": true,
	"accepted": true, "rejected": true, "withdrawn": true,
}

// ToLegacyStatus maps the richer Stage pipeline onto the original 5-value
// Status field so existing readers (dashboards, counts) keep working.
func ToLegacyStatus(stage string) string {
	switch stage {
	case "submitted", "under_review":
		return "applied"
	case "shortlisted", "interview_scheduled", "assessment_sent":
		return "interview"
	case "offer_extended", "accepted":
		return "offer"
	case "rejected", "withdrawn":
		return "rejected"
	default:
		return "applied"
	}
}
