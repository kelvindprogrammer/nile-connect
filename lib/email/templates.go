package email

import (
	"fmt"
	"time"
)

func wrap(title, body string) string {
	return fmt.Sprintf(`<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
<h2 style="color:#1E499D">%s</h2>
<p>%s</p>
<p style="color:#888;font-size:12px;margin-top:32px">Nile Connect — Career Placement</p>
</div>`, title, body)
}

// NewApplicationTemplate notifies an employer of a new application.
func NewApplicationTemplate(studentName, jobTitle string) (string, string) {
	subject := "New application: " + jobTitle
	body := fmt.Sprintf("%s just applied to your job posting <strong>%s</strong>. Review the application in your ATS dashboard.", studentName, jobTitle)
	return subject, wrap(subject, body)
}

// SendApplicationConfirmation emails the applicant directly (not via notify,
// since actor == recipient and notify.Create no-ops on self-notifications).
func SendApplicationConfirmation(to, studentName, jobTitle string) {
	subject := "Application submitted: " + jobTitle
	body := fmt.Sprintf("Hi %s, your application for <strong>%s</strong> has been submitted successfully. You can track its progress from your Application Tracker.", studentName, jobTitle)
	Send(to, subject, wrap(subject, body))
}

// CandidateWithdrewTemplate notifies an employer that an applicant withdrew.
func CandidateWithdrewTemplate(studentName, jobTitle string) (string, string) {
	subject := "Candidate withdrew: " + jobTitle
	body := fmt.Sprintf("%s has withdrawn their application for <strong>%s</strong>.", studentName, jobTitle)
	return subject, wrap(subject, body)
}

// stageEmailCopy returns a student-facing subject/body for a pipeline stage change.
func stageEmailCopy(jobTitle, companyName, stage string) (string, string) {
	switch stage {
	case "shortlisted":
		return "You've been shortlisted: " + jobTitle,
			fmt.Sprintf("Great news — %s has shortlisted your application for <strong>%s</strong>.", companyName, jobTitle)
	case "interview_scheduled":
		return "Interview invitation: " + jobTitle,
			fmt.Sprintf("%s would like to interview you for <strong>%s</strong>. Check your Application Tracker for details.", companyName, jobTitle)
	case "assessment_sent":
		return "Assessment invitation: " + jobTitle,
			fmt.Sprintf("%s has sent you an assessment for <strong>%s</strong>. Check your Application Tracker for details.", companyName, jobTitle)
	case "offer_extended":
		return "Offer received: " + jobTitle,
			fmt.Sprintf("Congratulations! %s has extended you an offer for <strong>%s</strong>.", companyName, jobTitle)
	case "rejected":
		return "Update on your application: " + jobTitle,
			fmt.Sprintf("Thank you for applying to <strong>%s</strong> at %s. The employer has decided not to move forward with your application at this time.", jobTitle, companyName)
	default:
		return "Application update: " + jobTitle,
			fmt.Sprintf("Your application for <strong>%s</strong> at %s has moved to a new stage: %s.", jobTitle, companyName, stage)
	}
}

// ApplicationStageChangedTemplate notifies a student their application stage changed.
func ApplicationStageChangedTemplate(jobTitle, companyName, stage string) (string, string) {
	subject, body := stageEmailCopy(jobTitle, companyName, stage)
	return subject, wrap(subject, body)
}

// JobApprovedTemplate notifies an employer their job posting was approved.
func JobApprovedTemplate(jobTitle string) (string, string) {
	subject := "Job approved: " + jobTitle
	body := fmt.Sprintf("Your job posting <strong>%s</strong> has been reviewed and approved. It is now live on the job board.", jobTitle)
	return subject, wrap(subject, body)
}

// JobRejectedTemplate notifies an employer their job posting was rejected.
func JobRejectedTemplate(jobTitle, reason string) (string, string) {
	subject := "Job posting needs changes: " + jobTitle
	body := fmt.Sprintf("Your job posting <strong>%s</strong> was not approved.", jobTitle)
	if reason != "" {
		body += " Reason: " + reason
	}
	return subject, wrap(subject, body)
}

// JobAwaitingReviewTemplate notifies staff a new job needs review.
func JobAwaitingReviewTemplate(jobTitle, companyName string) (string, string) {
	subject := "Job awaiting review: " + jobTitle
	body := fmt.Sprintf("%s submitted a new job posting <strong>%s</strong> that needs your review.", companyName, jobTitle)
	return subject, wrap(subject, body)
}

// EmployerStatusTemplate notifies an employer of an approval/rejection decision.
func EmployerStatusTemplate(companyName, status string) (string, string) {
	if status == "approved" {
		subject := "Your employer account has been approved"
		body := fmt.Sprintf("Welcome, %s! Your employer account has been approved. You can now post jobs to the board.", companyName)
		return subject, wrap(subject, body)
	}
	subject := "Update on your employer account"
	body := fmt.Sprintf("Your employer account (%s) was not approved. Contact career services for details.", companyName)
	return subject, wrap(subject, body)
}

// EmployerVerifiedTemplate notifies an employer they received a verification badge.
func EmployerVerifiedTemplate(companyName string) (string, string) {
	subject := "You're verified on Nile Connect"
	body := fmt.Sprintf("%s now has a verified badge on Nile Connect, increasing trust with student applicants.", companyName)
	return subject, wrap(subject, body)
}

// NewEmployerRegisteredTemplate notifies staff of a new employer signup.
func NewEmployerRegisteredTemplate(companyName string) (string, string) {
	subject := "New employer registration: " + companyName
	body := fmt.Sprintf("%s just registered as an employer partner and is awaiting review.", companyName)
	return subject, wrap(subject, body)
}

// VerifyEmailTemplate carries the employer's email confirmation link.
func VerifyEmailTemplate(link string) (string, string) {
	subject := "Confirm your employer email"
	body := fmt.Sprintf(`Please confirm your email address to continue your employer registration: <a href="%s">%s</a>. This link expires in 24 hours.`, link, link)
	return subject, wrap(subject, body)
}

// SendDeadlineReminder emails a student directly about an approaching deadline.
func SendDeadlineReminder(to, studentName, jobTitle string, deadline time.Time) {
	subject := "Deadline approaching: " + jobTitle
	body := fmt.Sprintf("Hi %s, the application deadline for <strong>%s</strong> is coming up soon (%s). Don't miss it!", studentName, jobTitle, deadline.Format("Jan 2, 2006"))
	Send(to, subject, wrap(subject, body))
}
