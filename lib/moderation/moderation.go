// Package moderation owns reporting, sanctions and the audit trail.
//
// The spec's requirement is precise: every report must have a traceable
// lifecycle, and an admin must be able to answer
//
//	who -> did what -> when -> where -> against whom -> what action was taken
//
// so the central rule of this package is that no moderation outcome is ever
// produced by a bare UPDATE. Every mutating function here — FileReport,
// SetContentStatus, RestrictUser, LiftRestriction, ResolveReport — writes an
// immutable ModerationAction row inside the SAME transaction as its effect.
// If the audit row cannot be written, the effect rolls back with it. That is
// what makes moderation auditable rather than merely logged.
package moderation

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"nile-connect/lib/models"
	"nile-connect/lib/textparse"
)

// ── Report reasons ────────────────────────────────────────────────────────────

// Reason categorises a report. The list is short on purpose: long taxonomies
// push reporters into "Other" and destroy the signal.
type Reason string

const (
	ReasonSpam                 Reason = "spam"
	ReasonHarassment           Reason = "harassment"
	ReasonHateSpeech           Reason = "hate_speech"
	ReasonViolence             Reason = "violence"
	ReasonSexualContent        Reason = "sexual_content"
	ReasonSelfHarm             Reason = "self_harm"
	ReasonImpersonation        Reason = "impersonation"
	ReasonMisinformation       Reason = "misinformation"
	ReasonIntellectualProperty Reason = "intellectual_property"
	ReasonAcademicDishonesty   Reason = "academic_dishonesty"
	ReasonOther                Reason = "other"
)

// ReasonMeta drives the report UI from the server, so all clients offer the
// same options and the same wording.
type ReasonMeta struct {
	Reason Reason `json:"reason"`
	Label  string `json:"label"`
	Help   string `json:"help"`
	// Priority seeds Report.Priority. Reports that may involve someone's
	// safety jump the queue automatically rather than waiting their turn.
	Priority int `json:"-"`
}

var reasonCatalog = []ReasonMeta{
	{ReasonSelfHarm, "Self-harm or suicide", "Someone may be in danger or in crisis.", 100},
	{ReasonViolence, "Violence or threats", "Threats, or content promoting violence.", 90},
	{ReasonHarassment, "Harassment or bullying", "Targeted abuse, intimidation, or unwanted contact.", 80},
	{ReasonHateSpeech, "Hate speech", "Attacks based on identity or protected characteristics.", 80},
	{ReasonSexualContent, "Sexual content", "Nudity or sexual content, or sexual content involving a minor.", 85},
	{ReasonImpersonation, "Impersonation", "Pretending to be someone else, or a fake account.", 50},
	{ReasonAcademicDishonesty, "Academic dishonesty", "Selling or sharing exam material, or contract cheating.", 60},
	{ReasonSpam, "Spam or scam", "Repetitive promotion, phishing, or a financial scam.", 40},
	{ReasonMisinformation, "False information", "Content likely to mislead others.", 30},
	{ReasonIntellectualProperty, "Intellectual property", "Someone's work used without permission.", 30},
	{ReasonOther, "Something else", "Tell us what's wrong in your own words.", 20},
}

var reasonByValue = func() map[Reason]ReasonMeta {
	m := map[Reason]ReasonMeta{}
	for _, r := range reasonCatalog {
		m[r.Reason] = r
	}
	return m
}()

// ReasonCatalog returns the reasons in the order clients should show them:
// safety-critical first, so a distressed reporter finds the right option fast.
func ReasonCatalog() []ReasonMeta {
	out := make([]ReasonMeta, len(reasonCatalog))
	copy(out, reasonCatalog)
	return out
}

// IsValidReason reports whether raw names a known reason.
func IsValidReason(raw string) bool {
	_, ok := reasonByValue[Reason(raw)]
	return ok
}

// PriorityFor returns the queue priority a reason earns.
func PriorityFor(raw string) int {
	if m, ok := reasonByValue[Reason(raw)]; ok {
		return m.Priority
	}
	return reasonByValue[ReasonOther].Priority
}

// IsUrgent marks reasons that should page a human rather than sit in a queue.
func IsUrgent(raw string) bool { return PriorityFor(raw) >= 85 }

// ── Subjects, statuses, actions ───────────────────────────────────────────────

const (
	SubjectPost    = "post"
	SubjectComment = "comment"
	SubjectStory   = "story"
	SubjectUser    = "user"
	SubjectGroup   = "group"
	SubjectMessage = "message"
)

var validSubjects = map[string]bool{
	SubjectPost: true, SubjectComment: true, SubjectStory: true,
	SubjectUser: true, SubjectGroup: true, SubjectMessage: true,
}

// Report lifecycle.
const (
	StatusOpen      = "open"
	StatusTriaged   = "triaged"
	StatusResolved  = "resolved"
	StatusDismissed = "dismissed"
)

// ActionType names an entry in the audit log.
type ActionType string

const (
	ActionReportFiled     ActionType = "report_filed"
	ActionReportTriaged   ActionType = "report_triaged"
	ActionReportResolved  ActionType = "report_resolved"
	ActionReportDismissed ActionType = "report_dismissed"

	ActionContentHidden   ActionType = "content_hidden"
	ActionContentRestored ActionType = "content_restored"
	ActionContentRemoved  ActionType = "content_removed"

	ActionUserWarned     ActionType = "user_warned"
	ActionUserRestricted ActionType = "user_restricted"
	ActionUserBanned     ActionType = "user_banned"
	ActionUserReinstated ActionType = "user_reinstated"

	ActionModeratorViewed ActionType = "moderator_viewed"
)

// Restriction types applied to a user.
const (
	RestrictionBanned  = "banned"
	RestrictionPost    = "post_restricted"
	RestrictionComment = "comment_restricted"
	RestrictionMessage = "message_restricted"
)

var validRestrictions = map[string]bool{
	RestrictionBanned: true, RestrictionPost: true,
	RestrictionComment: true, RestrictionMessage: true,
}

var (
	ErrInvalidSubject = errors.New("that cannot be reported")
	ErrInvalidReason  = errors.New("please choose a reason")
	ErrSelfReport     = errors.New("you cannot report your own content")
	ErrDuplicate      = errors.New("you have already reported this")
)

// ── Filing a report ───────────────────────────────────────────────────────────

// FileReportInput is what a reporter supplies plus what the caller resolved.
type FileReportInput struct {
	ReporterID  string
	SubjectType string
	SubjectID   string
	// SubjectOwnerID is denormalised so the queue still identifies the
	// reported party after the content is deleted.
	SubjectOwnerID string
	Reason         string
	Details        string
	// SnapshotContent preserves what was actually reported. Without it a
	// moderator reviewing tomorrow sees only an edited or deleted shell and
	// cannot judge the report at all.
	SnapshotContent string
}

// FileReport records a report and its audit entry atomically.
//
// Duplicate reports from the same reporter on the same subject are rejected
// rather than stacked: they add no information and would let one person inflate
// a subject's apparent severity.
func FileReport(db *gorm.DB, in FileReportInput) (models.Report, error) {
	if !validSubjects[in.SubjectType] || in.SubjectID == "" {
		return models.Report{}, ErrInvalidSubject
	}
	if !IsValidReason(in.Reason) {
		return models.Report{}, ErrInvalidReason
	}
	if in.ReporterID == "" {
		return models.Report{}, ErrInvalidSubject
	}
	if in.SubjectOwnerID != "" && in.SubjectOwnerID == in.ReporterID {
		return models.Report{}, ErrSelfReport
	}
	if in.SubjectType == SubjectUser && in.SubjectID == in.ReporterID {
		return models.Report{}, ErrSelfReport
	}

	var existing int64
	db.Model(&models.Report{}).
		Where("reporter_id = ? AND subject_type = ? AND subject_id = ? AND status IN ?",
			in.ReporterID, in.SubjectType, in.SubjectID, []string{StatusOpen, StatusTriaged}).
		Count(&existing)
	if existing > 0 {
		return models.Report{}, ErrDuplicate
	}

	report := models.Report{
		ReporterID:      in.ReporterID,
		SubjectType:     in.SubjectType,
		SubjectID:       in.SubjectID,
		SubjectOwnerID:  in.SubjectOwnerID,
		Reason:          in.Reason,
		Details:         textparse.Excerpt(in.Details, 2000),
		Status:          StatusOpen,
		Priority:        PriorityFor(in.Reason),
		SnapshotContent: textparse.Excerpt(in.SnapshotContent, 4000),
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&report).Error; err != nil {
			return err
		}
		// The audit row shares the transaction: a report that exists without
		// its audit entry would be exactly the invisible moderation the spec
		// forbids.
		return writeAction(tx, ActionInput{
			ActorID:        in.ReporterID,
			ActionType:     ActionReportFiled,
			SubjectType:    in.SubjectType,
			SubjectID:      in.SubjectID,
			SubjectOwnerID: in.SubjectOwnerID,
			ReportID:       report.ID,
			Reason:         in.Reason,
			Metadata:       map[string]any{"priority": report.Priority},
		})
	})
	if err != nil {
		return models.Report{}, err
	}
	return report, nil
}

// ── The audit log ─────────────────────────────────────────────────────────────

// ActionInput describes one auditable moderation event.
type ActionInput struct {
	ActorID        string
	ActionType     ActionType
	SubjectType    string
	SubjectID      string
	SubjectOwnerID string
	ReportID       string
	Reason         string
	Metadata       map[string]any
	ExpiresAt      *time.Time
}

// writeAction appends to the audit log inside the caller's transaction.
func writeAction(tx *gorm.DB, in ActionInput) error {
	meta := ""
	if len(in.Metadata) > 0 {
		if b, err := json.Marshal(in.Metadata); err == nil {
			meta = string(b)
		}
	}
	return tx.Create(&models.ModerationAction{
		ActorID:        in.ActorID,
		ActionType:     string(in.ActionType),
		SubjectType:    in.SubjectType,
		SubjectID:      in.SubjectID,
		SubjectOwnerID: in.SubjectOwnerID,
		ReportID:       in.ReportID,
		Reason:         in.Reason,
		Metadata:       meta,
		ExpiresAt:      in.ExpiresAt,
	}).Error
}

// LogAction writes a standalone audit entry (one with no other side effect),
// such as a moderator opening reported content for review.
func LogAction(db *gorm.DB, in ActionInput) error {
	return writeAction(db, in)
}

// ── Acting on content ─────────────────────────────────────────────────────────

// contentTables maps a subject type to the table carrying its
// moderation_status column.
var contentTables = map[string]string{
	SubjectPost:    "posts",
	SubjectComment: "comments",
	SubjectStory:   "stories",
}

// SetContentStatus hides, removes or restores a piece of content and records
// why, atomically.
//
// Content is never hard-deleted here. A removed post keeps its row so the
// report that caused the removal stays reviewable and an appeal is possible —
// deleting the evidence alongside the offence makes the decision unauditable.
func SetContentStatus(db *gorm.DB, moderatorID, subjectType, subjectID, ownerID, status, reason, reportID string) error {
	table, ok := contentTables[subjectType]
	if !ok {
		return ErrInvalidSubject
	}
	if status != "active" && status != "hidden" && status != "removed" {
		return fmt.Errorf("unknown moderation status %q", status)
	}

	action := ActionContentHidden
	switch status {
	case "removed":
		action = ActionContentRemoved
	case "active":
		action = ActionContentRestored
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Table(table).Where("id = ?", subjectID).
			Update("moderation_status", status).Error; err != nil {
			return err
		}
		return writeAction(tx, ActionInput{
			ActorID:        moderatorID,
			ActionType:     action,
			SubjectType:    subjectType,
			SubjectID:      subjectID,
			SubjectOwnerID: ownerID,
			ReportID:       reportID,
			Reason:         reason,
			Metadata:       map[string]any{"status": status},
		})
	})
}

// ── Acting on users ───────────────────────────────────────────────────────────

// RestrictUser applies a sanction. duration of zero means indefinite.
func RestrictUser(db *gorm.DB, moderatorID, userID, restrictionType, reason string, duration time.Duration, reportID string) error {
	if !validRestrictions[restrictionType] {
		return fmt.Errorf("unknown restriction %q", restrictionType)
	}
	if userID == "" || moderatorID == "" {
		return ErrInvalidSubject
	}
	// A moderator sanctioning themselves is always a mistake or an attack.
	if userID == moderatorID {
		return errors.New("you cannot restrict your own account")
	}

	var expires *time.Time
	if duration > 0 {
		t := time.Now().Add(duration)
		expires = &t
	}

	action := ActionUserRestricted
	if restrictionType == RestrictionBanned {
		action = ActionUserBanned
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// Lift any existing restriction of the same type first, so a user
		// never accumulates several overlapping rows whose combined effect is
		// ambiguous.
		now := time.Now()
		if err := tx.Model(&models.UserRestriction{}).
			Where("user_id = ? AND type = ? AND lifted_at IS NULL", userID, restrictionType).
			Updates(map[string]any{"lifted_at": now, "lifted_by": moderatorID}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.UserRestriction{
			UserID: userID, Type: restrictionType, Reason: reason,
			IssuedBy: moderatorID, ExpiresAt: expires,
		}).Error; err != nil {
			return err
		}
		return writeAction(tx, ActionInput{
			ActorID:        moderatorID,
			ActionType:     action,
			SubjectType:    SubjectUser,
			SubjectID:      userID,
			SubjectOwnerID: userID,
			ReportID:       reportID,
			Reason:         reason,
			Metadata:       map[string]any{"restriction": restrictionType, "indefinite": expires == nil},
			ExpiresAt:      expires,
		})
	})
}

// LiftRestriction reinstates a user and records who did it.
func LiftRestriction(db *gorm.DB, moderatorID, userID, restrictionType, reason string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Model(&models.UserRestriction{}).
			Where("user_id = ? AND type = ? AND lifted_at IS NULL", userID, restrictionType).
			Updates(map[string]any{"lifted_at": now, "lifted_by": moderatorID}).Error; err != nil {
			return err
		}
		return writeAction(tx, ActionInput{
			ActorID:        moderatorID,
			ActionType:     ActionUserReinstated,
			SubjectType:    SubjectUser,
			SubjectID:      userID,
			SubjectOwnerID: userID,
			Reason:         reason,
			Metadata:       map[string]any{"restriction": restrictionType},
		})
	})
}

// Restrictions is the set of sanctions currently in force for a user.
type Restrictions struct {
	Banned            bool `json:"banned"`
	PostRestricted    bool `json:"post_restricted"`
	CommentRestricted bool `json:"comment_restricted"`
	MessageRestricted bool `json:"message_restricted"`
	// Until is the soonest expiry among the active restrictions, for UI copy.
	Until  *time.Time `json:"until,omitempty"`
	Reason string     `json:"reason,omitempty"`
}

// Any reports whether the user is under any sanction at all.
func (r Restrictions) Any() bool {
	return r.Banned || r.PostRestricted || r.CommentRestricted || r.MessageRestricted
}

// ActiveRestrictions loads the sanctions in force right now. Expired rows are
// ignored without needing a sweeper job, so a temporary restriction lapses on
// its own even if no background task runs.
func ActiveRestrictions(db *gorm.DB, userID string) Restrictions {
	var out Restrictions
	if userID == "" {
		return out
	}
	var rows []models.UserRestriction
	db.Where("user_id = ? AND lifted_at IS NULL AND (expires_at IS NULL OR expires_at > ?)",
		userID, time.Now()).Find(&rows)

	for i := range rows {
		switch rows[i].Type {
		case RestrictionBanned:
			out.Banned = true
		case RestrictionPost:
			out.PostRestricted = true
		case RestrictionComment:
			out.CommentRestricted = true
		case RestrictionMessage:
			out.MessageRestricted = true
		}
		if out.Reason == "" {
			out.Reason = rows[i].Reason
		}
		if rows[i].ExpiresAt != nil && (out.Until == nil || rows[i].ExpiresAt.Before(*out.Until)) {
			out.Until = rows[i].ExpiresAt
		}
	}
	return out
}

// CanPost, CanComment, CanMessage are the write-path gates. Every content
// creation route must consult the relevant one; a restriction that is only
// shown in the UI is not a restriction.
func (r Restrictions) CanPost() bool    { return !r.Banned && !r.PostRestricted }
func (r Restrictions) CanComment() bool { return !r.Banned && !r.CommentRestricted }
func (r Restrictions) CanMessage() bool { return !r.Banned && !r.MessageRestricted }

// RestrictionMessage renders user-facing copy explaining the sanction. It
// deliberately states the expiry: an open-ended "you can't do that" is far
// more distressing than a dated one.
func (r Restrictions) RestrictionMessage(action string) string {
	if !r.Any() {
		return ""
	}
	var what string
	switch {
	case r.Banned:
		what = "Your account is suspended"
	default:
		what = fmt.Sprintf("You can't %s right now", action)
	}
	if r.Until != nil {
		return fmt.Sprintf("%s until %s.", what, r.Until.Format("2 Jan 2006, 15:04"))
	}
	return what + ". Contact Career Services if you think this is a mistake."
}

// ── Resolving reports ─────────────────────────────────────────────────────────

// ResolveReport closes a report with an outcome and records it.
func ResolveReport(db *gorm.DB, moderatorID, reportID, status, resolution string) error {
	if status != StatusResolved && status != StatusDismissed && status != StatusTriaged {
		return fmt.Errorf("unknown report status %q", status)
	}
	var report models.Report
	if err := db.Where("id = ?", reportID).First(&report).Error; err != nil {
		return err
	}

	action := ActionReportResolved
	switch status {
	case StatusDismissed:
		action = ActionReportDismissed
	case StatusTriaged:
		action = ActionReportTriaged
	}

	return db.Transaction(func(tx *gorm.DB) error {
		updates := map[string]any{"status": status, "resolution": resolution}
		if status != StatusTriaged {
			now := time.Now()
			updates["resolved_by"] = moderatorID
			updates["resolved_at"] = now
		} else {
			updates["assigned_to"] = moderatorID
		}
		if err := tx.Model(&models.Report{}).Where("id = ?", reportID).
			Updates(updates).Error; err != nil {
			return err
		}
		return writeAction(tx, ActionInput{
			ActorID:        moderatorID,
			ActionType:     action,
			SubjectType:    report.SubjectType,
			SubjectID:      report.SubjectID,
			SubjectOwnerID: report.SubjectOwnerID,
			ReportID:       reportID,
			Reason:         report.Reason,
			Metadata:       map[string]any{"resolution": resolution},
		})
	})
}

// ── Queue and history ─────────────────────────────────────────────────────────

// QueueFilter narrows the moderation queue.
type QueueFilter struct {
	Status      string
	SubjectType string
	Reason      string
	AssignedTo  string
	Limit       int
	Offset      int
}

// Queue returns reports ordered by priority then age, so safety-critical
// reports are handled first and nothing starves at the bottom.
func Queue(db *gorm.DB, f QueueFilter) ([]models.Report, int64) {
	q := db.Model(&models.Report{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.SubjectType != "" {
		q = q.Where("subject_type = ?", f.SubjectType)
	}
	if f.Reason != "" {
		q = q.Where("reason = ?", f.Reason)
	}
	if f.AssignedTo != "" {
		q = q.Where("assigned_to = ?", f.AssignedTo)
	}

	var total int64
	q.Count(&total)

	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	var out []models.Report
	q.Order("priority desc, created_at asc").Limit(limit).Offset(f.Offset).Find(&out)
	return out, total
}

// SubjectHistory returns every audit entry touching one subject, newest first.
// This is the "what happened to this post" view.
func SubjectHistory(db *gorm.DB, subjectType, subjectID string, limit int) []models.ModerationAction {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var out []models.ModerationAction
	db.Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).
		Order("created_at desc").Limit(limit).Find(&out)
	return out
}

// UserHistory returns every audit entry where a user was the subject — their
// full moderation record, which is what a moderator needs before deciding
// whether an offence is a first or a fifth.
func UserHistory(db *gorm.DB, userID string, limit int) []models.ModerationAction {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var out []models.ModerationAction
	db.Where("subject_owner_id = ? OR (subject_type = ? AND subject_id = ?)",
		userID, SubjectUser, userID).
		Order("created_at desc").Limit(limit).Find(&out)
	return out
}

// ModeratorActivity returns what one moderator has done, so moderation itself
// is reviewable. Moderator abuse is a real risk the spec names explicitly.
func ModeratorActivity(db *gorm.DB, moderatorID string, limit int) []models.ModerationAction {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var out []models.ModerationAction
	db.Where("actor_id = ?", moderatorID).
		Order("created_at desc").Limit(limit).Find(&out)
	return out
}

// Stats summarises the queue for the admin dashboard.
type Stats struct {
	Open               int64 `json:"open"`
	Triaged            int64 `json:"triaged"`
	Urgent             int64 `json:"urgent"`
	ResolvedToday      int64 `json:"resolved_today"`
	ActiveRestrictions int64 `json:"active_restrictions"`
}

// LoadStats computes the dashboard counters.
func LoadStats(db *gorm.DB) Stats {
	var s Stats
	db.Model(&models.Report{}).Where("status = ?", StatusOpen).Count(&s.Open)
	db.Model(&models.Report{}).Where("status = ?", StatusTriaged).Count(&s.Triaged)
	db.Model(&models.Report{}).
		Where("status IN ? AND priority >= ?", []string{StatusOpen, StatusTriaged}, 85).
		Count(&s.Urgent)

	startOfDay := time.Now().Truncate(24 * time.Hour)
	db.Model(&models.Report{}).
		Where("status IN ? AND resolved_at >= ?", []string{StatusResolved, StatusDismissed}, startOfDay).
		Count(&s.ResolvedToday)

	db.Model(&models.UserRestriction{}).
		Where("lifted_at IS NULL AND (expires_at IS NULL OR expires_at > ?)", time.Now()).
		Count(&s.ActiveRestrictions)
	return s
}
