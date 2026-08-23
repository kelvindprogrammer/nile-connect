// Package ratelimit enforces per-user action quotas.
//
// Design constraint: this runs on Vercel serverless functions, so there is no
// process that lives long enough to hold a counter, and no Redis in the stack.
// An in-memory limiter would reset on every cold start and be trivially
// bypassed by whichever container answered next.
//
// So the limiter counts the durable rows the action itself creates —
// "how many posts has this user written in the last hour" is answered by
// counting posts. That is exact, survives cold starts, needs no new
// infrastructure, and cannot drift from reality because it *is* reality.
//
// The trade-off is that it only limits actions that leave a row behind. Every
// abuse vector the spec names (mass posting, comment spam, mention blasts,
// follow churn, report flooding) does leave one, so the trade is worth taking.
package ratelimit

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// Rule is one quota: at most Max of an action inside Window.
type Rule struct {
	Max    int
	Window time.Duration
	// Message is shown to the user when the rule trips. Written to be
	// non-accusatory — most people who hit a limit are enthusiastic, not
	// malicious.
	Message string
}

// Action names a rate-limited operation.
type Action string

const (
	ActionPost           Action = "post"
	ActionComment        Action = "comment"
	ActionReaction       Action = "reaction"
	ActionFollow         Action = "follow"
	ActionReport         Action = "report"
	ActionStory          Action = "story"
	ActionGroupCreate    Action = "group_create"
	ActionMessage        Action = "message"
	ActionUpload         Action = "upload"
	ActionConnectRequest Action = "connect_request"
)

// Rules are deliberately generous for humans and tight for scripts.
//
// The numbers come from what an enthusiastic student plausibly does in a
// burst: a dozen posts an hour is a very active day; 300 reactions an hour is
// roughly one every twelve seconds sustained, which no human does by hand.
var Rules = map[Action]Rule{
	ActionPost: {Max: 20, Window: time.Hour,
		Message: "You've posted a lot in the last hour. Take a short break and try again soon."},
	ActionComment: {Max: 100, Window: time.Hour,
		Message: "You've commented a lot in the last hour. Try again a little later."},
	ActionReaction: {Max: 300, Window: time.Hour,
		Message: "That's a lot of reactions in one hour. Try again shortly."},
	ActionFollow: {Max: 100, Window: 24 * time.Hour,
		Message: "You've followed a lot of people today. Try again tomorrow."},
	ActionReport: {Max: 20, Window: 24 * time.Hour,
		Message: "You've submitted several reports today. Our team is reviewing them."},
	ActionStory: {Max: 30, Window: 24 * time.Hour,
		Message: "You've shared a lot of stories today. Try again tomorrow."},
	ActionGroupCreate: {Max: 5, Window: 24 * time.Hour,
		Message: "You've created several groups today. Try again tomorrow."},
	ActionMessage: {Max: 500, Window: time.Hour,
		Message: "You've sent a lot of messages this hour. Try again shortly."},
	ActionUpload: {Max: 60, Window: time.Hour,
		Message: "You've uploaded a lot of files this hour. Try again shortly."},
	ActionConnectRequest: {Max: 50, Window: 24 * time.Hour,
		Message: "You've sent many connection requests today. Try again tomorrow."},
}

// Decision is the outcome of a check.
type Decision struct {
	Allowed bool
	// Remaining is how many more of the action are permitted in this window.
	Remaining int
	// RetryAfter is how long until the oldest counted item leaves the window.
	RetryAfter time.Duration
	Message    string
}

// Error renders a Decision as an error for handlers that prefer that shape.
func (d Decision) Error() error {
	if d.Allowed {
		return nil
	}
	return fmt.Errorf("%s", d.Message)
}

// Counter describes how to count occurrences of an action for a user. Each
// action maps to a table and the columns that identify the actor and the time.
type Counter struct {
	Table    string
	ActorCol string
	TimeCol  string
	// Extra is an optional additional predicate, e.g. excluding soft-deleted
	// rows. It must be a constant string — never interpolated user input.
	Extra string
}

// counters binds each action to the durable rows it creates.
var counters = map[Action]Counter{
	ActionPost:           {Table: "posts", ActorCol: "author_id", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
	ActionComment:        {Table: "comments", ActorCol: "author_id", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
	ActionReaction:       {Table: "reactions", ActorCol: "user_id", TimeCol: "created_at"},
	ActionFollow:         {Table: "follows", ActorCol: "follower_id", TimeCol: "created_at"},
	ActionReport:         {Table: "reports", ActorCol: "reporter_id", TimeCol: "created_at"},
	ActionStory:          {Table: "stories", ActorCol: "author_id", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
	ActionGroupCreate:    {Table: "groups", ActorCol: "created_by", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
	ActionMessage:        {Table: "messages", ActorCol: "sender_id", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
	ActionConnectRequest: {Table: "connections", ActorCol: "requester_id", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
	// Uploads leave no domain row of their own, so media_uploads is written
	// on every accepted upload specifically to make this quota enforceable
	// (and to give storage accounting and media moderation something to work
	// with). See models.MediaUpload.
	ActionUpload: {Table: "media_uploads", ActorCol: "user_id", TimeCol: "created_at", Extra: "deleted_at IS NULL"},
}

// Check reports whether userID may perform action now.
//
// It fails OPEN: if the count query errors, the action is allowed. A limiter
// that locks every user out when the database hiccups is a worse outage than
// the abuse it prevents, and every limited action has a second line of defence
// (moderation, reporting, restrictions).
func Check(db *gorm.DB, userID string, action Action) Decision {
	rule, ok := Rules[action]
	if !ok || userID == "" {
		return Decision{Allowed: true, Remaining: -1}
	}
	counter, ok := counters[action]
	if !ok {
		// No durable row to count — nothing to enforce against.
		return Decision{Allowed: true, Remaining: -1}
	}

	since := time.Now().Add(-rule.Window)
	where := fmt.Sprintf("%s = ? AND %s > ?", counter.ActorCol, counter.TimeCol)
	if counter.Extra != "" {
		where += " AND " + counter.Extra
	}

	var n int64
	if err := db.Table(counter.Table).Where(where, userID, since).Count(&n).Error; err != nil {
		return Decision{Allowed: true, Remaining: -1}
	}

	remaining := rule.Max - int(n)
	if remaining < 0 {
		remaining = 0
	}
	if int(n) < rule.Max {
		return Decision{Allowed: true, Remaining: remaining}
	}

	// Over the limit. Find when the oldest counted row ages out, so the client
	// can show a real "try again in N minutes" rather than a vague refusal.
	retry := rule.Window
	var oldest time.Time
	row := db.Table(counter.Table).
		Select(counter.TimeCol).
		Where(where, userID, since).
		Order(counter.TimeCol + " asc").
		Limit(1).
		Row()
	if row != nil && row.Scan(&oldest) == nil && !oldest.IsZero() {
		retry = time.Until(oldest.Add(rule.Window))
		if retry < 0 {
			retry = 0
		}
	}

	return Decision{
		Allowed:    false,
		Remaining:  0,
		RetryAfter: retry,
		Message:    rule.Message,
	}
}

// Allow is the boolean convenience form.
func Allow(db *gorm.DB, userID string, action Action) bool {
	return Check(db, userID, action).Allowed
}

// RetryAfterSeconds renders a Decision's RetryAfter for the HTTP header of the
// same name, rounding up so the client never retries a moment too early.
func (d Decision) RetryAfterSeconds() int {
	if d.Allowed || d.RetryAfter <= 0 {
		return 0
	}
	secs := int(d.RetryAfter.Seconds())
	if d.RetryAfter > time.Duration(secs)*time.Second {
		secs++
	}
	if secs < 1 {
		secs = 1
	}
	return secs
}
