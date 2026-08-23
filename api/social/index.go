// Package handler is the single HTTP entry point for the social layer.
//
// Why one function for many domains: the Vercel Hobby plan caps the project at
// 12 serverless functions and the rest of the API already uses 11. This handler
// therefore routes every social domain through one function via ?path=, exactly
// as api/messages already does for messaging, notifications and connections.
//
// That is a platform constraint, not an architectural preference. The domain
// logic itself lives in separate, independently testable packages —
// lib/socialgraph, lib/privacy, lib/moderation, lib/reactions, lib/feedrank,
// lib/textparse, lib/mediaguard, lib/ratelimit — and this file stays a thin
// dispatcher that parses input, enforces auth, and delegates. Nothing here
// should contain business rules.
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"nile-connect/lib/analytics"
	"nile-connect/lib/db"
	"nile-connect/lib/groups"
	"nile-connect/lib/models"
	"nile-connect/lib/moderation"
	"nile-connect/lib/mw"
	"nile-connect/lib/notify"
	"nile-connect/lib/polls"
	"nile-connect/lib/privacy"
	"nile-connect/lib/ratelimit"
	"nile-connect/lib/reactions"
	"nile-connect/lib/respond"
	"nile-connect/lib/socialgraph"
	"nile-connect/lib/stories"
	"nile-connect/lib/textparse"
)

// route describes one endpoint: which methods it accepts and whether it needs
// a signed-in caller. Declaring this in a table keeps the auth requirement
// next to the route rather than buried in each handler, so a new endpoint
// cannot silently ship without an auth decision.
type route struct {
	handle    func(w http.ResponseWriter, r *http.Request, c *ctx)
	authed    bool
	staffOnly bool
}

// ctx carries the per-request essentials so each handler does not re-resolve
// them.
type ctx struct {
	db   *gorm.DB
	auth *mw.AuthCtx
	// role is the caller's live database role, not the possibly-stale JWT claim.
	role string
}

func (c *ctx) userID() string {
	if c.auth == nil {
		return ""
	}
	return c.auth.UserID
}

func (c *ctx) isStaff() bool { return c.role == "staff" }

var routes = map[string]route{
	// ── Social graph ──────────────────────────────────────────────────────
	"follow":        {handle: handleFollow, authed: true},
	"block":         {handle: handleBlock, authed: true},
	"mute":          {handle: handleMute, authed: true},
	"close-friends": {handle: handleCloseFriends, authed: true},
	"relation":      {handle: handleRelation, authed: true},
	"followers":     {handle: handleFollowers, authed: true},
	"following":     {handle: handleFollowing, authed: true},

	// ── Privacy ───────────────────────────────────────────────────────────
	"privacy": {handle: handlePrivacy, authed: true},

	// ── Reactions ─────────────────────────────────────────────────────────
	"react":            {handle: handleReact, authed: true},
	"reactions":        {handle: handleReactionList, authed: true},
	"reaction-catalog": {handle: handleReactionCatalog},

	// ── Bookmarks ─────────────────────────────────────────────────────────
	"bookmark":    {handle: handleBookmark, authed: true},
	"bookmarks":   {handle: handleBookmarkList, authed: true},
	"collections": {handle: handleCollections, authed: true},

	// ── Feed control ──────────────────────────────────────────────────────
	"feed-signal": {handle: handleFeedSignal, authed: true},

	// ── Moderation ────────────────────────────────────────────────────────
	"report":         {handle: handleReport, authed: true},
	"report-reasons": {handle: handleReportReasons},
	"mod-queue":      {handle: handleModQueue, authed: true, staffOnly: true},
	"mod-resolve":    {handle: handleModResolve, authed: true, staffOnly: true},
	"mod-content":    {handle: handleModContent, authed: true, staffOnly: true},
	"mod-restrict":   {handle: handleModRestrict, authed: true, staffOnly: true},
	"mod-history":    {handle: handleModHistory, authed: true, staffOnly: true},
	"mod-stats":      {handle: handleModStats, authed: true, staffOnly: true},

	// ── Stories ───────────────────────────────────────────────────────────
	"story-tray":     {handle: handleStoryTray, authed: true},
	"stories":        {handle: handleStories, authed: true},
	"story-view":     {handle: handleStoryView, authed: true},
	"story-insights": {handle: handleStoryInsights, authed: true},
	"story-reply":    {handle: handleStoryReply, authed: true},

	// ── Polls ─────────────────────────────────────────────────────────────
	"poll":        {handle: handlePoll, authed: true},
	"poll-vote":   {handle: handlePollVote, authed: true},
	"poll-voters": {handle: handlePollVoters, authed: true},

	// ── Groups & communities ──────────────────────────────────────────────
	"groups":           {handle: handleGroups, authed: true},
	"group-membership": {handle: handleGroupMembership, authed: true},
	"group-members":    {handle: handleGroupMembers, authed: true},
	"group-invites":    {handle: handleGroupInvites, authed: true},
	"group-posts":      {handle: handleGroupPosts, authed: true},
	"communities":      {handle: handleCommunities, authed: true},

	// ── Real-time & push ──────────────────────────────────────────────────
	"stream":         {handle: handleStream, authed: true},
	"push-subscribe": {handle: handlePushSubscribe, authed: true},
	"push-key":       {handle: handlePushKey, authed: true},

	// ── Discovery ─────────────────────────────────────────────────────────
	"mention-search": {handle: handleMentionSearch, authed: true},
	"hashtag":        {handle: handleHashtag, authed: true},
	"trending":       {handle: handleTrending, authed: true},
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}

	path := r.URL.Query().Get("path")
	rt, ok := routes[path]
	if !ok {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	c := &ctx{db: database}
	if auth, err := mw.Auth(r); err == nil {
		c.auth = auth
		c.role = liveRole(database, auth.UserID)
		if c.role == "" {
			c.role = auth.Role
		}
	}

	if rt.authed && c.auth == nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if rt.staffOnly && !c.isStaff() {
		respond.Error(w, http.StatusForbidden, "staff access required")
		return
	}

	// A banned user may still read, so they can see why and appeal, but every
	// write path additionally checks the specific restriction it cares about.
	rt.handle(w, r, c)
}

// liveRole reads the role from the database rather than trusting the JWT,
// matching the pattern used across the rest of the API: a role change or a
// suspension must take effect immediately, not when the 7-day cookie expires.
func liveRole(database *gorm.DB, userID string) string {
	var u models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", userID).First(&u).Error; err != nil {
		return ""
	}
	return u.Role
}

// ── shared helpers ────────────────────────────────────────────────────────────

func decode(r *http.Request, dst any) bool {
	return json.NewDecoder(r.Body).Decode(dst) == nil
}

func queryTarget(r *http.Request) string {
	return strings.TrimSpace(r.URL.Query().Get("id"))
}

func paginate(r *http.Request) (limit, offset int) {
	limit = 25
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 && v <= 100 {
		limit = v
	}
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v > 0 {
		offset = v
	}
	return limit, offset
}

// rateLimited writes a 429 with a Retry-After header and reports whether the
// request should stop. Returning the header matters: without it a client
// retries blindly and makes the problem worse.
func rateLimited(w http.ResponseWriter, c *ctx, action ratelimit.Action) bool {
	d := ratelimit.Check(c.db, c.userID(), action)
	if d.Allowed {
		return false
	}
	w.Header().Set("Retry-After", strconv.Itoa(d.RetryAfterSeconds()))
	respond.Error(w, http.StatusTooManyRequests, d.Message)
	return true
}

// userSummary is the compact person shape returned by every list endpoint, so
// clients render people identically everywhere.
type userSummary struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	Major     string `json:"major,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Verified  bool   `json:"is_verified"`
}

func loadUserSummaries(database *gorm.DB, ids []string) map[string]userSummary {
	out := map[string]userSummary{}
	if len(ids) == 0 {
		return out
	}
	var users []models.User
	database.Where("id IN ? AND deleted_at IS NULL", ids).Find(&users)
	for i := range users {
		u := users[i]
		out[u.ID] = userSummary{
			ID: u.ID, Name: u.FullName, Username: u.Username,
			Role: u.Role, Major: u.Major, Verified: u.IsVerified,
		}
	}
	return out
}

// orderedSummaries preserves the caller's id order, which list endpoints rely
// on to keep their ranking.
func orderedSummaries(database *gorm.DB, ids []string) []userSummary {
	byID := loadUserSummaries(database, ids)
	out := make([]userSummary, 0, len(ids))
	for _, id := range ids {
		if u, ok := byID[id]; ok {
			out = append(out, u)
		}
	}
	return out
}

// ── Social graph ──────────────────────────────────────────────────────────────

func handleFollow(w http.ResponseWriter, r *http.Request, c *ctx) {
	target := queryTarget(r)
	if target == "" {
		respond.Error(w, http.StatusBadRequest, "user id required as ?id=")
		return
	}
	switch r.Method {
	case http.MethodPost:
		if rateLimited(w, c, ratelimit.ActionFollow) {
			return
		}
		if err := socialgraph.FollowUser(c.db, c.userID(), target); err != nil {
			// A block is reported as a generic failure rather than "you are
			// blocked", so following cannot be used to probe block state.
			respond.Error(w, http.StatusForbidden, "that action is not available")
			return
		}
		notifyFollow(c, target)
		analytics.Track(c.db, c.userID(), analytics.UserFollowed, "user", target, nil)
		respond.OK(w, map[string]any{"following": true})
	case http.MethodDelete:
		if err := socialgraph.UnfollowUser(c.db, c.userID(), target); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not unfollow")
			return
		}
		respond.OK(w, map[string]any{"following": false})
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleBlock(w http.ResponseWriter, r *http.Request, c *ctx) {
	target := queryTarget(r)
	if target == "" {
		respond.Error(w, http.StatusBadRequest, "user id required as ?id=")
		return
	}
	switch r.Method {
	case http.MethodGet:
		var blocks []models.Block
		c.db.Where("blocker_id = ?", c.userID()).Order("created_at desc").Find(&blocks)
		ids := make([]string, 0, len(blocks))
		for i := range blocks {
			ids = append(ids, blocks[i].BlockedID)
		}
		respond.OK(w, map[string]any{"users": orderedSummaries(c.db, ids)})
	case http.MethodPost:
		var body struct {
			Reason string `json:"reason"`
		}
		decode(r, &body)
		if err := socialgraph.BlockUser(c.db, c.userID(), target, body.Reason); err != nil {
			respond.Error(w, http.StatusBadRequest, "could not block that user")
			return
		}
		analytics.Track(c.db, c.userID(), analytics.UserBlocked, "user", target, nil)
		respond.OK(w, map[string]any{"blocked": true})
	case http.MethodDelete:
		if err := socialgraph.UnblockUser(c.db, c.userID(), target); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not unblock")
			return
		}
		respond.OK(w, map[string]any{"blocked": false})
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleMute(w http.ResponseWriter, r *http.Request, c *ctx) {
	target := queryTarget(r)
	if target == "" {
		respond.Error(w, http.StatusBadRequest, "user id required as ?id=")
		return
	}
	switch r.Method {
	case http.MethodPost:
		var body struct {
			Scope    string `json:"scope"`
			Duration string `json:"duration"` // "", "24h", "168h"
		}
		decode(r, &body)
		var d time.Duration
		if body.Duration != "" {
			if parsed, err := time.ParseDuration(body.Duration); err == nil && parsed > 0 {
				d = parsed
			}
		}
		if err := socialgraph.MuteUser(c.db, c.userID(), target, body.Scope, d); err != nil {
			respond.Error(w, http.StatusBadRequest, "could not mute that user")
			return
		}
		analytics.Track(c.db, c.userID(), analytics.UserMuted, "user", target,
			analytics.Props{"scope": body.Scope})
		respond.OK(w, map[string]any{"muted": true})
	case http.MethodDelete:
		if err := socialgraph.UnmuteUser(c.db, c.userID(), target); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not unmute")
			return
		}
		respond.OK(w, map[string]any{"muted": false})
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleCloseFriends(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		var rows []models.CloseFriend
		c.db.Where("owner_id = ?", c.userID()).Order("created_at desc").Find(&rows)
		ids := make([]string, 0, len(rows))
		for i := range rows {
			ids = append(ids, rows[i].FriendID)
		}
		respond.OK(w, map[string]any{"users": orderedSummaries(c.db, ids)})
	case http.MethodPost:
		target := queryTarget(r)
		if err := socialgraph.AddCloseFriend(c.db, c.userID(), target); err != nil {
			respond.Error(w, http.StatusBadRequest, "could not add that person")
			return
		}
		respond.OK(w, map[string]any{"added": true})
	case http.MethodDelete:
		if err := socialgraph.RemoveCloseFriend(c.db, c.userID(), queryTarget(r)); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not remove that person")
			return
		}
		respond.OK(w, map[string]any{"added": false})
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleRelation(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	target := queryTarget(r)
	if target == "" {
		respond.Error(w, http.StatusBadRequest, "user id required as ?id=")
		return
	}
	rel := socialgraph.Resolve(c.db, c.userID(), target)
	settings := privacy.SettingsFor(c.db, target)
	counts := socialgraph.CountsFor(c.db, target)
	mutual := socialgraph.MutualConnectionIDs(c.db, c.userID(), target, 5)

	// A blocked viewer is told nothing about the subject beyond the block
	// itself — counts and mutuals would leak information about someone who
	// has cut contact.
	if rel.EitherBlocked() {
		respond.OK(w, map[string]any{
			"blocked_by_me": rel.Blocking,
			"blocks_me":     rel.BlockedBy,
			"can_interact":  false,
		})
		return
	}

	respond.OK(w, map[string]any{
		"following":          rel.Following,
		"followed_by":        rel.FollowedBy,
		"connected":          rel.Connected,
		"pending":            rel.ConnectionPending,
		"close_friend":       rel.SubjectIsCloseFriend,
		"muted":              rel.Muted,
		"blocked_by_me":      rel.Blocking,
		"blocks_me":          rel.BlockedBy,
		"can_interact":       true,
		"can_message":        privacy.Can(rel, settings, privacy.ActionMessage),
		"can_mention":        privacy.Can(rel, settings, privacy.ActionMention),
		"can_view_profile":   privacy.CanViewProfile(rel, settings, privacy.ViewContext{}),
		"counts":             counts,
		"mutual_connections": orderedSummaries(c.db, mutual),
	})
}

func handleFollowers(w http.ResponseWriter, r *http.Request, c *ctx) {
	listGraphEdge(w, r, c, "followee_id", "follower_id")
}

func handleFollowing(w http.ResponseWriter, r *http.Request, c *ctx) {
	listGraphEdge(w, r, c, "follower_id", "followee_id")
}

// listGraphEdge lists one side of the follow graph for a subject, applying the
// subject's profile privacy first.
func listGraphEdge(w http.ResponseWriter, r *http.Request, c *ctx, matchCol, selectCol string) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	subject := queryTarget(r)
	if subject == "" {
		subject = c.userID()
	}

	// Reading someone's follower list is reading their profile.
	rel := socialgraph.Resolve(c.db, c.userID(), subject)
	if !privacy.CanViewProfile(rel, privacy.SettingsFor(c.db, subject), privacy.ViewContext{ViewerIsModerator: c.isStaff()}) {
		respond.Error(w, http.StatusForbidden, "that profile is private")
		return
	}

	limit, offset := paginate(r)
	var ids []string
	c.db.Model(&models.Follow{}).
		Where(matchCol+" = ?", subject).
		Order("created_at desc").Limit(limit).Offset(offset).
		Pluck(selectCol, &ids)

	// Never surface people the viewer has blocked (or who blocked them) in a
	// list they browse.
	ids = removeAll(ids, socialgraph.BlockedIDs(c.db, c.userID()))

	var total int64
	c.db.Model(&models.Follow{}).Where(matchCol+" = ?", subject).Count(&total)

	respond.OK(w, map[string]any{
		"users":    orderedSummaries(c.db, ids),
		"total":    total,
		"has_more": int64(offset+limit) < total,
	})
}

func removeAll(ids, remove []string) []string {
	if len(remove) == 0 {
		return ids
	}
	drop := map[string]bool{}
	for _, id := range remove {
		drop[id] = true
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if !drop[id] {
			out = append(out, id)
		}
	}
	return out
}

// ── Privacy ───────────────────────────────────────────────────────────────────

func handlePrivacy(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		s := privacy.SettingsFor(c.db, c.userID())
		respond.OK(w, map[string]any{
			"settings":  s,
			"audiences": privacy.VisibleAudiencesFor(c.db, c.userID()),
		})
	case http.MethodPut:
		var body struct {
			ProfileVisibility    *string `json:"profile_visibility"`
			DefaultPostAudience  *string `json:"default_post_audience"`
			DefaultStoryAudience *string `json:"default_story_audience"`
			WhoCanMention        *string `json:"who_can_mention"`
			WhoCanMessage        *string `json:"who_can_message"`
			WhoCanAddToGroups    *string `json:"who_can_add_to_groups"`
			WhoCanComment        *string `json:"who_can_comment"`
			ShowOnlineStatus     *bool   `json:"show_online_status"`
			ShowActivityStatus   *bool   `json:"show_activity_status"`
			DiscoverableInSearch *bool   `json:"discoverable_in_search"`
			AllowStoryResharing  *bool   `json:"allow_story_resharing"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}

		current := privacy.SettingsFor(c.db, c.userID())
		current.UserID = c.userID()
		// Every incoming value is normalised against the CURRENT setting as
		// the fallback, so an unrecognised value from a stale client leaves
		// the user's choice untouched instead of widening it.
		if body.ProfileVisibility != nil {
			current.ProfileVisibility = privacy.NormalizeAudience(*body.ProfileVisibility, current.ProfileVisibility)
		}
		if body.DefaultPostAudience != nil {
			current.DefaultPostAudience = privacy.NormalizeAudience(*body.DefaultPostAudience, current.DefaultPostAudience)
		}
		if body.DefaultStoryAudience != nil {
			current.DefaultStoryAudience = privacy.NormalizeAudience(*body.DefaultStoryAudience, current.DefaultStoryAudience)
		}
		if body.WhoCanMention != nil {
			current.WhoCanMention = privacy.NormalizeGate(*body.WhoCanMention, current.WhoCanMention)
		}
		if body.WhoCanMessage != nil {
			current.WhoCanMessage = privacy.NormalizeGate(*body.WhoCanMessage, current.WhoCanMessage)
		}
		if body.WhoCanAddToGroups != nil {
			current.WhoCanAddToGroups = privacy.NormalizeGate(*body.WhoCanAddToGroups, current.WhoCanAddToGroups)
		}
		if body.WhoCanComment != nil {
			current.WhoCanComment = privacy.NormalizeGate(*body.WhoCanComment, current.WhoCanComment)
		}
		if body.ShowOnlineStatus != nil {
			current.ShowOnlineStatus = *body.ShowOnlineStatus
		}
		if body.ShowActivityStatus != nil {
			current.ShowActivityStatus = *body.ShowActivityStatus
		}
		if body.DiscoverableInSearch != nil {
			current.DiscoverableInSearch = *body.DiscoverableInSearch
		}
		if body.AllowStoryResharing != nil {
			current.AllowStoryResharing = *body.AllowStoryResharing
		}

		if err := c.db.Save(&current).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not save your privacy settings")
			return
		}
		analytics.Track(c.db, c.userID(), analytics.PrivacyChanged, "user", c.userID(), nil)
		respond.OK(w, map[string]any{"settings": current})
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── Reactions ─────────────────────────────────────────────────────────────────

func handleReactionCatalog(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	respond.OK(w, map[string]any{"reactions": reactions.Catalog()})
}

func handleReact(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		SubjectType string `json:"subject_type"`
		SubjectID   string `json:"subject_id"`
		Reaction    string `json:"reaction"`
	}
	if !decode(r, &body) || body.SubjectID == "" {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if rateLimited(w, c, ratelimit.ActionReaction) {
		return
	}

	// Reacting requires being able to SEE the thing. Without this check a
	// reaction is an oracle: react to an id, read the count, learn that
	// private content exists.
	ownerID, audience, ok := subjectOwnerAndAudience(c.db, body.SubjectType, body.SubjectID)
	if !ok {
		respond.Error(w, http.StatusNotFound, "that content is no longer available")
		return
	}
	rel := socialgraph.Resolve(c.db, c.userID(), ownerID)
	if !privacy.CanView(rel, audience, privacy.ViewContext{}) {
		respond.Error(w, http.StatusNotFound, "that content is no longer available")
		return
	}

	res, err := reactions.Toggle(c.db, body.SubjectType, body.SubjectID, c.userID(), body.Reaction)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "could not save your reaction")
		return
	}
	if res.Added || res.Changed {
		notifyReaction(c, ownerID, body.SubjectType, body.SubjectID, res.Summary.Mine)
	}
	respond.OK(w, map[string]any{
		"summary": res.Summary,
		"added":   res.Added,
		"changed": res.Changed,
		"removed": res.Removed,
	})
}

func handleReactionList(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	subjectType := r.URL.Query().Get("subject_type")
	subjectID := queryTarget(r)
	if subjectID == "" {
		respond.Error(w, http.StatusBadRequest, "subject id required as ?id=")
		return
	}
	ownerID, audience, ok := subjectOwnerAndAudience(c.db, subjectType, subjectID)
	if !ok {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}
	rel := socialgraph.Resolve(c.db, c.userID(), ownerID)
	if !privacy.CanView(rel, audience, privacy.ViewContext{}) {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}

	limit, offset := paginate(r)
	kind := reactions.Kind(r.URL.Query().Get("reaction"))
	ids := reactions.ReactorIDs(c.db, subjectType, subjectID, kind, limit, offset)
	ids = removeAll(ids, socialgraph.BlockedIDs(c.db, c.userID()))

	respond.OK(w, map[string]any{
		"users":   orderedSummaries(c.db, ids),
		"summary": reactions.SummaryFor(c.db, subjectType, subjectID, c.userID()),
	})
}

// subjectOwnerAndAudience resolves who owns a reactable/reportable subject and
// what audience governs it. Returning ok=false for anything deleted or
// moderated away keeps every caller's 404 behaviour consistent.
func subjectOwnerAndAudience(database *gorm.DB, subjectType, subjectID string) (ownerID, audience string, ok bool) {
	switch subjectType {
	case reactions.SubjectPost:
		var p models.Post
		if err := database.Where("id = ? AND deleted_at IS NULL AND moderation_status = 'active'", subjectID).
			First(&p).Error; err != nil {
			return "", "", false
		}
		return p.AuthorID, p.Audience, true
	case reactions.SubjectComment:
		var cm models.Comment
		if err := database.Where("id = ? AND deleted_at IS NULL AND moderation_status = 'active'", subjectID).
			First(&cm).Error; err != nil {
			return "", "", false
		}
		// A comment inherits its post's audience: it can never be more
		// visible than the thing it is attached to.
		var p models.Post
		if err := database.Where("id = ? AND deleted_at IS NULL", cm.PostID).First(&p).Error; err != nil {
			return "", "", false
		}
		return cm.AuthorID, p.Audience, true
	case reactions.SubjectStory:
		var st models.Story
		if err := database.Where("id = ? AND deleted_at IS NULL AND expires_at > ?", subjectID, time.Now()).
			First(&st).Error; err != nil {
			return "", "", false
		}
		return st.AuthorID, st.Audience, true
	}
	return "", "", false
}

// ── Bookmarks & collections ───────────────────────────────────────────────────

var bookmarkableSubjects = map[string]bool{
	"post": true, "job": true, "event": true, "document": true,
}

func handleBookmark(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodPost:
		var body struct {
			SubjectType  string  `json:"subject_type"`
			SubjectID    string  `json:"subject_id"`
			CollectionID *string `json:"collection_id"`
			Note         string  `json:"note"`
		}
		if !decode(r, &body) || !bookmarkableSubjects[body.SubjectType] || body.SubjectID == "" {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		// A collection id from the client must belong to the caller, or a
		// bookmark could be filed into someone else's collection.
		if body.CollectionID != nil && *body.CollectionID != "" {
			var owned int64
			c.db.Model(&models.Collection{}).
				Where("id = ? AND user_id = ? AND deleted_at IS NULL", *body.CollectionID, c.userID()).
				Count(&owned)
			if owned == 0 {
				respond.Error(w, http.StatusForbidden, "that collection is not yours")
				return
			}
		}
		bm := models.Bookmark{
			UserID: c.userID(), SubjectType: body.SubjectType,
			SubjectID: body.SubjectID, CollectionID: body.CollectionID,
			Note: textparse.Excerpt(body.Note, 500),
		}
		if err := c.db.Where("user_id = ? AND subject_type = ? AND subject_id = ?",
			c.userID(), body.SubjectType, body.SubjectID).
			Assign(map[string]any{"collection_id": body.CollectionID, "note": bm.Note}).
			FirstOrCreate(&bm).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not save that")
			return
		}
		recountCollection(c.db, body.CollectionID)
		analytics.Track(c.db, c.userID(), analytics.PostBookmarked, body.SubjectType, body.SubjectID, nil)
		respond.OK(w, map[string]any{"saved": true, "bookmark": bm})

	case http.MethodDelete:
		subjectType := r.URL.Query().Get("subject_type")
		subjectID := queryTarget(r)
		var existing models.Bookmark
		c.db.Where("user_id = ? AND subject_type = ? AND subject_id = ?",
			c.userID(), subjectType, subjectID).First(&existing)
		if err := c.db.Unscoped().Where("user_id = ? AND subject_type = ? AND subject_id = ?",
			c.userID(), subjectType, subjectID).Delete(&models.Bookmark{}).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not remove that")
			return
		}
		recountCollection(c.db, existing.CollectionID)
		respond.OK(w, map[string]any{"saved": false})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func recountCollection(database *gorm.DB, collectionID *string) {
	if collectionID == nil || *collectionID == "" {
		return
	}
	database.Exec(`UPDATE collections SET items_count = (
			SELECT COUNT(*) FROM bookmarks WHERE collection_id = ?
		) WHERE id = ?`, *collectionID, *collectionID)
}

func handleBookmarkList(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	limit, offset := paginate(r)
	q := c.db.Model(&models.Bookmark{}).Where("user_id = ?", c.userID())
	if st := r.URL.Query().Get("subject_type"); st != "" {
		q = q.Where("subject_type = ?", st)
	}
	if cid := r.URL.Query().Get("collection_id"); cid != "" {
		q = q.Where("collection_id = ?", cid)
	}
	var total int64
	q.Count(&total)

	var rows []models.Bookmark
	q.Order("created_at desc").Limit(limit).Offset(offset).Find(&rows)

	respond.OK(w, map[string]any{
		"bookmarks": rows,
		"total":     total,
		"has_more":  int64(offset+limit) < total,
	})
}

func handleCollections(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		var rows []models.Collection
		c.db.Where("user_id = ? AND deleted_at IS NULL", c.userID()).
			Order("created_at desc").Find(&rows)
		respond.OK(w, map[string]any{"collections": rows})
	case http.MethodPost:
		var body struct {
			Name string `json:"name"`
		}
		name := ""
		if decode(r, &body) {
			name = strings.TrimSpace(body.Name)
		}
		if name == "" {
			respond.Error(w, http.StatusBadRequest, "give your collection a name")
			return
		}
		col := models.Collection{UserID: c.userID(), Name: textparse.Excerpt(name, 60)}
		if err := c.db.Create(&col).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create that collection")
			return
		}
		respond.Created(w, map[string]any{"collection": col})
	case http.MethodDelete:
		id := queryTarget(r)
		// Deleting a collection must not delete the saved items inside it —
		// they simply become unfiled.
		if err := c.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&models.Bookmark{}).
				Where("collection_id = ? AND user_id = ?", id, c.userID()).
				Update("collection_id", nil).Error; err != nil {
				return err
			}
			return tx.Where("id = ? AND user_id = ?", id, c.userID()).
				Delete(&models.Collection{}).Error
		}); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not delete that collection")
			return
		}
		respond.OK(w, map[string]any{"deleted": true})
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── Feed control ──────────────────────────────────────────────────────────────

var validFeedSignals = map[string]bool{
	"not_interested": true, "hide_post": true, "mute_hashtag": true,
}

func handleFeedSignal(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodPost:
		var body struct {
			Signal      string `json:"signal"`
			SubjectType string `json:"subject_type"`
			SubjectID   string `json:"subject_id"`
		}
		if !decode(r, &body) || !validFeedSignals[body.Signal] || body.SubjectID == "" {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		sig := models.FeedSignal{
			UserID: c.userID(), Signal: body.Signal,
			SubjectType: body.SubjectType, SubjectID: body.SubjectID,
		}
		if err := c.db.Where("user_id = ? AND signal = ? AND subject_type = ? AND subject_id = ?",
			c.userID(), body.Signal, body.SubjectType, body.SubjectID).
			FirstOrCreate(&sig).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not record that")
			return
		}
		analytics.Track(c.db, c.userID(), analytics.PostHidden, body.SubjectType, body.SubjectID,
			analytics.Props{"reason": body.Signal})
		respond.OK(w, map[string]any{"recorded": true})

	case http.MethodDelete:
		// Undo. The spec asks for user control, and control includes changing
		// your mind.
		if err := c.db.Unscoped().Where("user_id = ? AND signal = ? AND subject_type = ? AND subject_id = ?",
			c.userID(), r.URL.Query().Get("signal"), r.URL.Query().Get("subject_type"), queryTarget(r)).
			Delete(&models.FeedSignal{}).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not undo that")
			return
		}
		respond.OK(w, map[string]any{"recorded": false})

	case http.MethodGet:
		var rows []models.FeedSignal
		c.db.Where("user_id = ?", c.userID()).Order("created_at desc").Limit(200).Find(&rows)
		respond.OK(w, map[string]any{"signals": rows})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── Moderation ────────────────────────────────────────────────────────────────

func handleReportReasons(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	respond.OK(w, map[string]any{"reasons": moderation.ReasonCatalog()})
}

func handleReport(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		SubjectType string `json:"subject_type"`
		SubjectID   string `json:"subject_id"`
		Reason      string `json:"reason"`
		Details     string `json:"details"`
	}
	if !decode(r, &body) {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if rateLimited(w, c, ratelimit.ActionReport) {
		return
	}

	ownerID, snapshot := reportSubjectContext(c.db, body.SubjectType, body.SubjectID)

	report, err := moderation.FileReport(c.db, moderation.FileReportInput{
		ReporterID:      c.userID(),
		SubjectType:     body.SubjectType,
		SubjectID:       body.SubjectID,
		SubjectOwnerID:  ownerID,
		Reason:          body.Reason,
		Details:         body.Details,
		SnapshotContent: snapshot,
	})
	if err != nil {
		status := http.StatusBadRequest
		if err == moderation.ErrDuplicate {
			status = http.StatusConflict
		}
		respond.Error(w, status, err.Error())
		return
	}

	notifyStaffOfUrgentReport(c, report)
	// The reason CATEGORY only — never the reporter's free-text details.
	analytics.Track(c.db, c.userID(), analytics.ReportSubmitted, report.SubjectType, report.SubjectID,
		analytics.Props{
			"reason":    report.Reason,
			"priority":  report.Priority,
			"is_urgent": moderation.IsUrgent(report.Reason),
		})

	respond.Created(w, map[string]any{
		"report_id": report.ID,
		"message":   "Thanks for letting us know. Our team will review this.",
	})
}

// reportSubjectContext resolves the owner and captures a content snapshot, so
// the report stays reviewable after the content is edited or deleted.
func reportSubjectContext(database *gorm.DB, subjectType, subjectID string) (ownerID, snapshot string) {
	switch subjectType {
	case moderation.SubjectPost:
		var p models.Post
		if database.Where("id = ?", subjectID).First(&p).Error == nil {
			return p.AuthorID, p.Content
		}
	case moderation.SubjectComment:
		var cm models.Comment
		if database.Where("id = ?", subjectID).First(&cm).Error == nil {
			return cm.AuthorID, cm.Content
		}
	case moderation.SubjectStory:
		var st models.Story
		if database.Where("id = ?", subjectID).First(&st).Error == nil {
			return st.AuthorID, st.Text
		}
	case moderation.SubjectMessage:
		var m models.Message
		if database.Where("id = ?", subjectID).First(&m).Error == nil {
			return m.SenderID, m.Content
		}
	case moderation.SubjectUser:
		var u models.User
		if database.Where("id = ?", subjectID).First(&u).Error == nil {
			return u.ID, u.FullName + " (@" + u.Username + ")"
		}
	case moderation.SubjectGroup:
		var g models.Group
		if database.Where("id = ?", subjectID).First(&g).Error == nil {
			return g.CreatedBy, g.Name + " — " + g.Description
		}
	}
	return "", ""
}

func handleModQueue(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	limit, offset := paginate(r)
	status := r.URL.Query().Get("status")
	if status == "" {
		status = moderation.StatusOpen
	}
	reports, total := moderation.Queue(c.db, moderation.QueueFilter{
		Status:      status,
		SubjectType: r.URL.Query().Get("subject_type"),
		Reason:      r.URL.Query().Get("reason"),
		Limit:       limit,
		Offset:      offset,
	})

	// Hydrate reporter and reported-party names in two queries rather than
	// two per row.
	ids := make([]string, 0, len(reports)*2)
	for i := range reports {
		ids = append(ids, reports[i].ReporterID, reports[i].SubjectOwnerID)
	}
	people := loadUserSummaries(c.db, ids)

	items := make([]map[string]any, 0, len(reports))
	for i := range reports {
		rep := reports[i]
		items = append(items, map[string]any{
			"report":        rep,
			"reporter":      people[rep.ReporterID],
			"subject_owner": people[rep.SubjectOwnerID],
			"is_urgent":     moderation.IsUrgent(rep.Reason),
		})
	}

	respond.OK(w, map[string]any{
		"reports":  items,
		"total":    total,
		"has_more": int64(offset+limit) < total,
	})
}

func handleModResolve(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		ReportID   string `json:"report_id"`
		Status     string `json:"status"`
		Resolution string `json:"resolution"`
	}
	if !decode(r, &body) || body.ReportID == "" {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := moderation.ResolveReport(c.db, c.userID(), body.ReportID, body.Status, body.Resolution); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	respond.OK(w, map[string]any{"updated": true})
}

func handleModContent(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		SubjectType string `json:"subject_type"`
		SubjectID   string `json:"subject_id"`
		Status      string `json:"status"`
		Reason      string `json:"reason"`
		ReportID    string `json:"report_id"`
	}
	if !decode(r, &body) {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ownerID, _ := reportSubjectContext(c.db, body.SubjectType, body.SubjectID)
	if err := moderation.SetContentStatus(c.db, c.userID(), body.SubjectType, body.SubjectID,
		ownerID, body.Status, body.Reason, body.ReportID); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	notifyContentAction(c, ownerID, body.SubjectType, body.Status, body.Reason)
	analytics.Track(c.db, c.userID(), analytics.ContentModerated, body.SubjectType, body.SubjectID,
		analytics.Props{"status": body.Status})
	respond.OK(w, map[string]any{"updated": true})
}

func handleModRestrict(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		UserID   string `json:"user_id"`
		Type     string `json:"type"`
		Reason   string `json:"reason"`
		Duration string `json:"duration"` // "" = indefinite
		Lift     bool   `json:"lift"`
		ReportID string `json:"report_id"`
	}
	if !decode(r, &body) || body.UserID == "" {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.Lift {
		if err := moderation.LiftRestriction(c.db, c.userID(), body.UserID, body.Type, body.Reason); err != nil {
			respond.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		respond.OK(w, map[string]any{"lifted": true})
		return
	}

	var d time.Duration
	if body.Duration != "" {
		if parsed, err := time.ParseDuration(body.Duration); err == nil && parsed > 0 {
			d = parsed
		}
	}
	if err := moderation.RestrictUser(c.db, c.userID(), body.UserID, body.Type, body.Reason, d, body.ReportID); err != nil {
		respond.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	notifyRestriction(c, body.UserID, body.Type, body.Reason)
	analytics.Track(c.db, c.userID(), analytics.UserRestricted, "user", body.UserID,
		analytics.Props{"restriction": body.Type})
	respond.OK(w, map[string]any{"restricted": true})
}

func handleModHistory(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	limit, _ := paginate(r)
	var actions []models.ModerationAction

	switch {
	case r.URL.Query().Get("user_id") != "":
		actions = moderation.UserHistory(c.db, r.URL.Query().Get("user_id"), limit)
	case r.URL.Query().Get("moderator_id") != "":
		actions = moderation.ModeratorActivity(c.db, r.URL.Query().Get("moderator_id"), limit)
	case queryTarget(r) != "":
		actions = moderation.SubjectHistory(c.db, r.URL.Query().Get("subject_type"), queryTarget(r), limit)
	default:
		c.db.Order("created_at desc").Limit(limit).Find(&actions)
	}

	ids := make([]string, 0, len(actions)*2)
	for i := range actions {
		ids = append(ids, actions[i].ActorID, actions[i].SubjectOwnerID)
	}
	respond.OK(w, map[string]any{"actions": actions, "people": loadUserSummaries(c.db, ids)})
}

func handleModStats(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	respond.OK(w, map[string]any{"stats": moderation.LoadStats(c.db)})
}

// ── Discovery ─────────────────────────────────────────────────────────────────

// handleMentionSearch powers the @-autocomplete. It applies the same privacy
// rules as search, so a user who has restricted mentions never appears as a
// suggestion to someone who is not allowed to mention them.
func handleMentionSearch(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	q := textparse.NormalizeHandle(r.URL.Query().Get("q"))
	if len(q) < 1 {
		respond.OK(w, map[string]any{"users": []userSummary{}})
		return
	}

	var users []models.User
	like := "%" + strings.ToLower(q) + "%"
	c.db.Where("deleted_at IS NULL AND (LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?)", like, like).
		Limit(30).Find(&users)

	ids := make([]string, 0, len(users))
	for i := range users {
		ids = append(ids, users[i].ID)
	}
	rels := socialgraph.ResolveMany(c.db, c.userID(), ids)
	settings := privacy.SettingsForMany(c.db, ids)

	// Connections first: when someone types "@ad", they almost always mean
	// the Ada they know rather than the Ada they do not.
	var connected, others []userSummary
	summaries := loadUserSummaries(c.db, ids)
	for _, id := range ids {
		rel := rels[id]
		if !privacy.Can(rel, settings[id], privacy.ActionMention) {
			continue
		}
		s := summaries[id]
		if rel.Connected || rel.Mutual() {
			connected = append(connected, s)
		} else {
			others = append(others, s)
		}
	}
	out := append(connected, others...)
	if len(out) > 10 {
		out = out[:10]
	}
	if out == nil {
		out = []userSummary{}
	}
	respond.OK(w, map[string]any{"users": out})
}

func handleHashtag(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	tag := textparse.NormalizeTag(r.URL.Query().Get("tag"))
	if tag == "" {
		respond.Error(w, http.StatusBadRequest, "a tag is required")
		return
	}
	var ht models.Hashtag
	if err := c.db.Where("tag = ?", tag).First(&ht).Error; err != nil {
		respond.OK(w, map[string]any{"tag": tag, "posts_count": 0, "post_ids": []string{}})
		return
	}
	if ht.IsBlocked && !c.isStaff() {
		respond.Error(w, http.StatusNotFound, "that topic is not available")
		return
	}

	limit, offset := paginate(r)
	var postIDs []string
	c.db.Model(&models.PostHashtag{}).Where("tag = ?", tag).
		Order("created_at desc").Limit(limit).Offset(offset).Pluck("post_id", &postIDs)

	respond.OK(w, map[string]any{
		"tag":         ht.Tag,
		"posts_count": ht.PostsCount,
		"post_ids":    postIDs,
	})
}

// handleTrending returns tags rising in the last 48 hours.
//
// Ranked by recent usage rather than all-time count, so a tag that was huge
// last term does not permanently occupy the trending list.
func handleTrending(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	type trend struct {
		Tag string `json:"tag"`
		N   int    `json:"count"`
	}
	var rows []trend
	c.db.Model(&models.PostHashtag{}).
		Select("post_hashtags.tag as tag, COUNT(*) as n").
		Joins("LEFT JOIN hashtags ON hashtags.tag = post_hashtags.tag").
		Where("post_hashtags.created_at > ? AND (hashtags.is_blocked IS NULL OR hashtags.is_blocked = false)",
			time.Now().Add(-48*time.Hour)).
		Group("post_hashtags.tag").
		Order("n desc").
		Limit(10).
		Scan(&rows)

	if rows == nil {
		rows = []trend{}
	}
	respond.OK(w, map[string]any{"trending": rows})
}

// ── Notification fan-out ──────────────────────────────────────────────────────
//
// Kept in this file rather than a sibling because Vercel's Go builder treats
// every .go file under api/ as a function entrypoint; a second file in this
// package with no exported Handler risks failing the build. Every other
// handler in this repo is a single index.go for the same reason.

// Notification fan-out for the social layer.
//
// Everything here is best-effort: a notification that fails to write must
// never fail the action that triggered it. Someone's reaction is not lost
// because the tray insert hiccupped.
//
// The important behaviour is grouping. Ten people reacting to one post
// produces ONE tray row that says "Ada and 9 others reacted", not ten rows.
// notify.Grouped does the merge keyed on GroupKey, which is what keeps the
// notification centre usable at 15,000 students rather than a firehose.

// notifyFollow tells someone they have a new follower.
func notifyFollow(c *ctx, targetID string) {
	actor := userName(c, c.userID())
	notify.Grouped(c.db, notify.GroupedInput{
		UserID:      targetID,
		ActorID:     c.userID(),
		Type:        "follow",
		GroupKey:    fmt.Sprintf("follow:%s", targetID),
		Title:       actor + " started following you",
		OthersTitle: "%s and %d others started following you",
		ActorName:   actor,
		Link:        "/student/network",
		SubjectType: "user",
		SubjectID:   c.userID(),
	})
}

// notifyReaction tells an author their content got a reaction.
func notifyReaction(c *ctx, ownerID, subjectType, subjectID string, kind reactions.Kind) {
	if ownerID == "" || ownerID == c.userID() {
		return // never notify yourself
	}
	// A reaction from someone the author has blocked must not reach them.
	if socialgraph.IsBlockedEither(c.db, ownerID, c.userID()) {
		return
	}

	actor := userName(c, c.userID())
	noun := map[string]string{
		"post": "your post", "comment": "your comment", "story": "your story",
	}[subjectType]
	if noun == "" {
		noun = "your content"
	}

	notify.Grouped(c.db, notify.GroupedInput{
		UserID:      ownerID,
		ActorID:     c.userID(),
		Type:        "reaction",
		GroupKey:    fmt.Sprintf("reaction:%s:%s", subjectType, subjectID),
		Title:       fmt.Sprintf("%s reacted to %s", actor, noun),
		OthersTitle: "%s and %d others reacted to " + noun,
		ActorName:   actor,
		Body:        string(kind),
		Link:        subjectLink(subjectType, subjectID),
		SubjectType: subjectType,
		SubjectID:   subjectID,
	})
}

// notifyContentAction tells an author their content was actioned by a
// moderator, and why.
//
// Silent removal is the single most corrosive moderation practice: people
// conclude the platform is arbitrary. Every action here is explained.
func notifyContentAction(c *ctx, ownerID, subjectType, status, reason string) {
	if ownerID == "" || ownerID == c.userID() {
		return
	}
	var title, body string
	switch status {
	case "hidden":
		title = "Your " + subjectType + " was hidden"
		body = "It is not visible to others while we review it."
	case "removed":
		title = "Your " + subjectType + " was removed"
		body = "It did not meet our community guidelines."
	case "active":
		title = "Your " + subjectType + " was restored"
		body = "After review, it is visible again. Thanks for your patience."
	default:
		return
	}
	if reason != "" {
		body += " Reason: " + reason
	}
	notify.Create(c.db, ownerID, c.userID(), "moderation", title, body, "/student")
}

// notifyRestriction tells a user about a sanction on their account.
func notifyRestriction(c *ctx, userID, restrictionType, reason string) {
	if userID == "" {
		return
	}
	title := "Your account has been restricted"
	if restrictionType == moderation.RestrictionBanned {
		title = "Your account has been suspended"
	}
	body := "Contact Career Services if you think this is a mistake."
	if reason != "" {
		body = reason + " " + body
	}
	notify.Create(c.db, userID, c.userID(), "moderation", title, body, "/student")
}

// notifyStaffOfUrgentReport pages staff for safety-critical reports rather
// than letting them wait in a queue nobody is watching.
func notifyStaffOfUrgentReport(c *ctx, report models.Report) {
	if !moderation.IsUrgent(report.Reason) {
		return
	}
	var staff []models.User
	c.db.Where("role = ? AND deleted_at IS NULL", "staff").Limit(50).Find(&staff)
	for i := range staff {
		notify.Create(c.db, staff[i].ID, report.ReporterID, "moderation_urgent",
			"Urgent report needs review",
			"A report was filed for "+report.Reason+". Please review it now.",
			"/staff/moderation")
	}
}

// subjectLink builds the deep link a notification opens.
func subjectLink(subjectType, subjectID string) string {
	switch subjectType {
	case "post", "comment":
		return "/student?post=" + subjectID
	case "story":
		return "/student/stories?id=" + subjectID
	}
	return "/student"
}

// userName resolves a display name, falling back to something readable rather
// than an empty string in a notification title.
func userName(c *ctx, id string) string {
	var u models.User
	if err := c.db.Select("full_name", "username").Where("id = ?", id).First(&u).Error; err != nil {
		return "Someone"
	}
	if u.FullName != "" {
		return u.FullName
	}
	if u.Username != "" {
		return "@" + u.Username
	}
	return "Someone"
}

// ── Stories ───────────────────────────────────────────────────────────────────

func handleStoryTray(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	trays := stories.LoadTray(c.db, c.userID())

	// Hydrate authors in one query rather than one per tray.
	ids := make([]string, 0, len(trays))
	for i := range trays {
		ids = append(ids, trays[i].AuthorID)
	}
	respond.OK(w, map[string]any{
		"trays":   trays,
		"authors": loadUserSummaries(c.db, ids),
	})
}

func handleStories(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		authorID := r.URL.Query().Get("author_id")
		if authorID == "" {
			authorID = c.userID()
		}
		items, err := stories.LoadForAuthor(c.db, c.userID(), authorID)
		if err != nil {
			respond.Error(w, http.StatusNotFound, err.Error())
			return
		}
		respond.OK(w, map[string]any{
			"stories": items,
			"author":  loadUserSummaries(c.db, []string{authorID})[authorID],
		})

	case http.MethodPost:
		restrictions := moderation.ActiveRestrictions(c.db, c.userID())
		if !restrictions.CanPost() {
			respond.Error(w, http.StatusForbidden, restrictions.RestrictionMessage("share a story"))
			return
		}
		if rateLimited(w, c, ratelimit.ActionStory) {
			return
		}

		var body struct {
			Kind            string   `json:"kind"`
			MediaURL        string   `json:"media_url"`
			ThumbnailURL    string   `json:"thumbnail_url"`
			Width           int      `json:"width"`
			Height          int      `json:"height"`
			DurationMs      int      `json:"duration_ms"`
			Text            string   `json:"text"`
			BackgroundColor string   `json:"background_color"`
			Overlays        string   `json:"overlays"`
			Audience        string   `json:"audience"`
			CustomAudience  []string `json:"custom_audience"`

			// An inline poll is created first and attached, so a story poll and
			// a post poll share one implementation.
			Poll *struct {
				Question    string   `json:"question"`
				Options     []string `json:"options"`
				IsAnonymous bool     `json:"is_anonymous"`
			} `json:"poll"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var pollID *string
		if body.Poll != nil && strings.TrimSpace(body.Poll.Question) != "" {
			p, err := polls.Create(c.db, polls.CreateInput{
				AuthorID: c.userID(), Question: body.Poll.Question,
				Options: body.Poll.Options, IsAnonymous: body.Poll.IsAnonymous,
				DurationHours: 24, HideResultsUntilVote: true,
			})
			if err != nil {
				respond.Error(w, http.StatusBadRequest, err.Error())
				return
			}
			pollID = &p.ID
		}

		story, err := stories.Create(c.db, stories.CreateInput{
			AuthorID: c.userID(), Kind: body.Kind,
			MediaURL: body.MediaURL, ThumbnailURL: body.ThumbnailURL,
			Width: body.Width, Height: body.Height, DurationMs: body.DurationMs,
			Text: body.Text, BackgroundColor: body.BackgroundColor,
			Overlays: body.Overlays, Audience: body.Audience,
			CustomAudience: body.CustomAudience, PollID: pollID,
		})
		if err != nil {
			respond.Error(w, http.StatusBadRequest, err.Error())
			return
		}

		// Mentions inside a story notify exactly like mentions in a post.
		indexStoryMentions(c, story.ID, body.Text)

		analytics.Track(c.db, c.userID(), analytics.StoryCreated, "story", story.ID, analytics.Props{
			"kind": story.Kind, "audience": story.Audience, "has_poll": pollID != nil,
		})
		respond.Created(w, map[string]any{"story": story})

	case http.MethodDelete:
		storyID := queryTarget(r)
		var story models.Story
		if err := c.db.Where("id = ?", storyID).First(&story).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "not found")
			return
		}
		if story.AuthorID != c.userID() && !c.isStaff() {
			respond.Error(w, http.StatusNotFound, "not found")
			return
		}
		if err := stories.Delete(c.db, storyID); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not delete that story")
			return
		}
		respond.OK(w, map[string]any{"deleted": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// indexStoryMentions notifies people named in a story, applying the same
// privacy gate as post mentions.
func indexStoryMentions(c *ctx, storyID, text string) {
	parsed := textparse.Parse(text)
	if len(parsed.Handles) == 0 {
		return
	}
	var users []models.User
	c.db.Where("LOWER(username) IN ? AND deleted_at IS NULL", parsed.Handles).Find(&users)
	ids := make([]string, 0, len(users))
	for i := range users {
		ids = append(ids, users[i].ID)
	}
	allowed, _ := privacy.FilterMentionable(c.db, c.userID(), ids)
	actor := userName(c, c.userID())
	for _, id := range allowed {
		if id == c.userID() {
			continue
		}
		c.db.Create(&models.Mention{
			SubjectType: "story", SubjectID: storyID,
			MentionedUserID: id, ActorID: c.userID(),
		})
		notify.Create(c.db, id, c.userID(), "mention",
			actor+" mentioned you in their story", "",
			"/student/stories?id="+storyID)
	}
}

func handleStoryView(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		StoryID   string `json:"story_id"`
		Completed bool   `json:"completed"`
	}
	if !decode(r, &body) || body.StoryID == "" {
		respond.Error(w, http.StatusBadRequest, "story_id is required")
		return
	}
	if err := stories.MarkViewed(c.db, body.StoryID, c.userID(), body.Completed); err != nil {
		respond.Error(w, http.StatusNotFound, err.Error())
		return
	}
	event := analytics.StoryViewed
	if body.Completed {
		event = analytics.StoryCompleted
	}
	analytics.Track(c.db, c.userID(), event, "story", body.StoryID,
		analytics.Props{"completed": body.Completed})
	respond.OK(w, map[string]any{"recorded": true})
}

// handleStoryInsights is the author-only analytics view.
func handleStoryInsights(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	storyID := queryTarget(r)
	var story models.Story
	if err := c.db.Where("id = ?", storyID).First(&story).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}
	// Viewer lists are the author's alone. Exposing them turns a casual share
	// into surveillance.
	if story.AuthorID != c.userID() {
		respond.Error(w, http.StatusForbidden, "only the author can see story insights")
		return
	}

	viewerIDs := stories.ViewerIDs(c.db, storyID, 100)
	respond.OK(w, map[string]any{
		"analytics": stories.LoadAnalytics(c.db, storyID),
		"viewers":   orderedSummaries(c.db, viewerIDs),
	})
}

// handleStoryReply sends a private message in response to a story, which is
// how story replies work everywhere: they are DMs, not public comments.
func handleStoryReply(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		StoryID string `json:"story_id"`
		Content string `json:"content"`
	}
	if !decode(r, &body) || body.StoryID == "" || strings.TrimSpace(body.Content) == "" {
		respond.Error(w, http.StatusBadRequest, "story_id and content are required")
		return
	}
	restrictions := moderation.ActiveRestrictions(c.db, c.userID())
	if !restrictions.CanMessage() {
		respond.Error(w, http.StatusForbidden, restrictions.RestrictionMessage("reply"))
		return
	}

	var story models.Story
	if err := c.db.Where("id = ?", body.StoryID).First(&story).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "that story is no longer available")
		return
	}
	if !stories.CanViewStory(c.db, c.userID(), &story) {
		respond.Error(w, http.StatusNotFound, "that story is no longer available")
		return
	}
	// The author's message privacy still applies to a story reply.
	rel := socialgraph.Resolve(c.db, c.userID(), story.AuthorID)
	if !privacy.Can(rel, privacy.SettingsFor(c.db, story.AuthorID), privacy.ActionMessage) {
		respond.Error(w, http.StatusForbidden, "you cannot message this person")
		return
	}

	content := textparse.Excerpt(strings.TrimSpace(body.Content), 1000)
	if err := c.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&models.Message{
			SenderID: c.userID(), ReceiverID: story.AuthorID, Content: content,
		}).Error; err != nil {
			return err
		}
		return tx.Exec(`UPDATE stories SET replies_count = replies_count + 1 WHERE id = ?`,
			body.StoryID).Error
	}); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not send your reply")
		return
	}

	notify.Create(c.db, story.AuthorID, c.userID(), "story_reply",
		userName(c, c.userID())+" replied to your story",
		textparse.Excerpt(content, 80), "/student/messages")

	respond.Created(w, map[string]any{"sent": true})
}

// ── Polls ─────────────────────────────────────────────────────────────────────

func handlePoll(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		view, err := polls.Load(c.db, queryTarget(r), c.userID())
		if err != nil {
			respond.Error(w, http.StatusNotFound, err.Error())
			return
		}
		respond.OK(w, map[string]any{"poll": view})

	case http.MethodPost:
		var body struct {
			Question             string   `json:"question"`
			Options              []string `json:"options"`
			IsAnonymous          bool     `json:"is_anonymous"`
			MultiChoice          bool     `json:"multi_choice"`
			DurationHours        int      `json:"duration_hours"`
			HideResultsUntilVote bool     `json:"hide_results_until_vote"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if rateLimited(w, c, ratelimit.ActionPost) {
			return
		}
		poll, err := polls.Create(c.db, polls.CreateInput{
			AuthorID: c.userID(), Question: body.Question, Options: body.Options,
			IsAnonymous: body.IsAnonymous, MultiChoice: body.MultiChoice,
			DurationHours: body.DurationHours, HideResultsUntilVote: body.HideResultsUntilVote,
		})
		if err != nil {
			respond.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		view, _ := polls.Load(c.db, poll.ID, c.userID())
		respond.Created(w, map[string]any{"poll": view})

	case http.MethodDelete:
		// Closing early, not deleting: a poll people voted in should not
		// vanish and take their votes with it.
		pollID := queryTarget(r)
		var poll models.Poll
		if err := c.db.Where("id = ?", pollID).First(&poll).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "not found")
			return
		}
		if poll.AuthorID != c.userID() && !c.isStaff() {
			respond.Error(w, http.StatusForbidden, "only the author can close this poll")
			return
		}
		if err := polls.Close(c.db, pollID); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not close that poll")
			return
		}
		respond.OK(w, map[string]any{"closed": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handlePollVote(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		PollID   string `json:"poll_id"`
		OptionID string `json:"option_id"`
	}
	if !decode(r, &body) || body.PollID == "" || body.OptionID == "" {
		respond.Error(w, http.StatusBadRequest, "poll_id and option_id are required")
		return
	}
	view, err := polls.Vote(c.db, body.PollID, body.OptionID, c.userID())
	if err != nil {
		status := http.StatusBadRequest
		if err == polls.ErrClosed {
			status = http.StatusConflict
		}
		respond.Error(w, status, err.Error())
		return
	}
	respond.OK(w, map[string]any{"poll": view})
}

func handlePollVoters(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	pollID := queryTarget(r)
	ids := polls.VoterIDs(c.db, pollID, r.URL.Query().Get("option_id"), 100)
	if ids == nil {
		// Anonymous poll: the empty list is the answer, not an error.
		respond.OK(w, map[string]any{"users": []userSummary{}, "anonymous": true})
		return
	}
	ids = removeAll(ids, socialgraph.BlockedIDs(c.db, c.userID()))
	respond.OK(w, map[string]any{"users": orderedSummaries(c.db, ids), "anonymous": false})
}

// ── Groups ────────────────────────────────────────────────────────────────────

// groupView is a group plus the caller's own standing in it, so the client
// never has to guess what buttons to show.
type groupView struct {
	models.Group
	MyRole            string `json:"my_role,omitempty"`
	MyStatus          string `json:"my_status,omitempty"`
	IsMember          bool   `json:"is_member"`
	CanPost           bool   `json:"can_post"`
	CanModerate       bool   `json:"can_moderate"`
	CanAdminister     bool   `json:"can_administer"`
	NotificationLevel string `json:"notification_level,omitempty"`
}

func toGroupView(g models.Group, m groups.Membership) groupView {
	return groupView{
		Group: g, MyRole: m.Role, MyStatus: m.Status,
		IsMember: m.IsActive(), CanPost: m.CanPost(&g),
		CanModerate: m.CanModerate(), CanAdminister: m.CanAdminister(),
		NotificationLevel: m.NotificationLevel,
	}
}

func handleGroups(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		if id := queryTarget(r); id != "" {
			loadOneGroup(w, c, id)
			return
		}
		scope := r.URL.Query().Get("scope")
		limit, offset := paginate(r)

		if scope == "mine" {
			list := groups.MyGroups(c.db, c.userID())
			ids := make([]string, 0, len(list))
			for i := range list {
				ids = append(ids, list[i].ID)
			}
			memberships := groups.MembershipsFor(c.db, c.userID(), ids)
			out := make([]groupView, 0, len(list))
			for i := range list {
				out = append(out, toGroupView(list[i], memberships[list[i].ID]))
			}
			respond.OK(w, map[string]any{"groups": out, "total": len(out), "has_more": false})
			return
		}

		list, total := groups.Discover(c.db, c.userID(), r.URL.Query().Get("q"), limit, offset)
		ids := make([]string, 0, len(list))
		for i := range list {
			ids = append(ids, list[i].ID)
		}
		memberships := groups.MembershipsFor(c.db, c.userID(), ids)
		out := make([]groupView, 0, len(list))
		for i := range list {
			out = append(out, toGroupView(list[i], memberships[list[i].ID]))
		}
		respond.OK(w, map[string]any{
			"groups": out, "total": total, "has_more": int64(offset+limit) < total,
		})

	case http.MethodPost:
		restrictions := moderation.ActiveRestrictions(c.db, c.userID())
		if restrictions.Banned {
			respond.Error(w, http.StatusForbidden, restrictions.RestrictionMessage("create a group"))
			return
		}
		if rateLimited(w, c, ratelimit.ActionGroupCreate) {
			return
		}
		var body struct {
			Name        string  `json:"name"`
			Description string  `json:"description"`
			CommunityID *string `json:"community_id"`
			Kind        string  `json:"kind"`
			Visibility  string  `json:"visibility"`
			JoinPolicy  string  `json:"join_policy"`
			AvatarURL   string  `json:"avatar_url"`
			CoverURL    string  `json:"cover_url"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		group, err := groups.CreateGroup(c.db, groups.CreateGroupInput{
			CreatorID: c.userID(), CommunityID: body.CommunityID,
			Name: body.Name, Description: body.Description, Kind: body.Kind,
			Visibility: body.Visibility, JoinPolicy: body.JoinPolicy,
			AvatarURL: body.AvatarURL, CoverURL: body.CoverURL,
		})
		if err != nil {
			respond.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		analytics.Track(c.db, c.userID(), analytics.GroupCreated, "group", group.ID,
			analytics.Props{"kind": group.Kind, "status": group.Visibility})
		respond.Created(w, map[string]any{
			"group": toGroupView(group, groups.MembershipFor(c.db, group.ID, c.userID())),
		})

	case http.MethodPut:
		groupID := queryTarget(r)
		var updates map[string]any
		if !decode(r, &updates) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if err := groups.UpdateGroup(c.db, groupID, c.userID(), updates); err != nil {
			respond.Error(w, http.StatusForbidden, err.Error())
			return
		}
		loadOneGroup(w, c, groupID)

	case http.MethodDelete:
		groupID := queryTarget(r)
		if err := groups.DeleteGroup(c.db, groupID, c.userID(), c.isStaff()); err != nil {
			respond.Error(w, http.StatusForbidden, err.Error())
			return
		}
		respond.OK(w, map[string]any{"deleted": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func loadOneGroup(w http.ResponseWriter, c *ctx, groupID string) {
	var group models.Group
	if err := c.db.Where("id = ? AND deleted_at IS NULL", groupID).First(&group).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "that group is no longer available")
		return
	}
	m := groups.MembershipFor(c.db, groupID, c.userID())
	// A private group returns 404 rather than 403 to a non-member: a 403
	// confirms the group exists, which is exactly what private should not do.
	if !groups.CanSeeGroup(&group, m, c.isStaff()) {
		respond.Error(w, http.StatusNotFound, "that group is no longer available")
		return
	}
	respond.OK(w, map[string]any{
		"group":    toGroupView(group, m),
		"can_read": groups.CanReadPosts(&group, m, c.isStaff()),
	})
}

func handleGroupMembership(w http.ResponseWriter, r *http.Request, c *ctx) {
	groupID := queryTarget(r)
	if groupID == "" {
		respond.Error(w, http.StatusBadRequest, "group id required as ?id=")
		return
	}

	switch r.Method {
	case http.MethodPost:
		res, err := groups.Join(c.db, groupID, c.userID())
		if err != nil {
			status := http.StatusForbidden
			if err == groups.ErrNotFound {
				status = http.StatusNotFound
			}
			respond.Error(w, status, err.Error())
			return
		}
		if res.Status == groups.StatusActive {
			analytics.Track(c.db, c.userID(), analytics.GroupJoined, "group", groupID, nil)
		}
		notifyGroupAdminsOfJoin(c, groupID, res.Status)
		respond.OK(w, map[string]any{"status": res.Status, "message": res.Message})

	case http.MethodDelete:
		if err := groups.Leave(c.db, groupID, c.userID()); err != nil {
			respond.Error(w, http.StatusConflict, err.Error())
			return
		}
		respond.OK(w, map[string]any{"left": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func notifyGroupAdminsOfJoin(c *ctx, groupID, status string) {
	if status != groups.StatusPending {
		return
	}
	var group models.Group
	if c.db.Where("id = ?", groupID).First(&group).Error != nil {
		return
	}
	var admins []models.GroupMember
	c.db.Where("group_id = ? AND status = ? AND role IN ?",
		groupID, groups.StatusActive, []string{groups.RoleOwner, groups.RoleAdmin, groups.RoleModerator}).
		Limit(20).Find(&admins)
	name := userName(c, c.userID())
	for i := range admins {
		notify.Grouped(c.db, notify.GroupedInput{
			UserID: admins[i].UserID, ActorID: c.userID(), Type: "group_request",
			GroupKey:    "group_request:" + groupID,
			Title:       name + " asked to join " + group.Name,
			OthersTitle: "%s and %d others asked to join " + group.Name,
			ActorName:   name,
			Link:        "/student/groups?id=" + groupID,
			SubjectType: "group", SubjectID: groupID,
		})
	}
}

func handleGroupMembers(w http.ResponseWriter, r *http.Request, c *ctx) {
	groupID := queryTarget(r)
	if groupID == "" {
		respond.Error(w, http.StatusBadRequest, "group id required as ?id=")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var group models.Group
		if err := c.db.Where("id = ? AND deleted_at IS NULL", groupID).First(&group).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "not found")
			return
		}
		m := groups.MembershipFor(c.db, groupID, c.userID())
		// The roster is member-only: a public group's member list is still
		// personal information about the people in it.
		if !m.IsActive() && !c.isStaff() {
			respond.Error(w, http.StatusForbidden, "join this group to see its members")
			return
		}
		status := r.URL.Query().Get("status")
		// Only moderators may inspect the pending or banned lists.
		if (status == groups.StatusPending || status == groups.StatusBanned) && !m.CanModerate() && !c.isStaff() {
			respond.Error(w, http.StatusForbidden, "you cannot view that list")
			return
		}
		limit, offset := paginate(r)
		rows, total := groups.Members(c.db, groupID, status, limit, offset)

		ids := make([]string, 0, len(rows))
		roles := map[string]string{}
		for i := range rows {
			ids = append(ids, rows[i].UserID)
			roles[rows[i].UserID] = rows[i].Role
		}
		people := orderedSummaries(c.db, ids)
		out := make([]map[string]any, 0, len(people))
		for _, p := range people {
			out = append(out, map[string]any{"user": p, "role": roles[p.ID]})
		}
		respond.OK(w, map[string]any{
			"members": out, "total": total, "has_more": int64(offset+limit) < total,
		})

	case http.MethodPost:
		var body struct {
			UserID   string `json:"user_id"`
			Action   string `json:"action"` // add | approve | decline | role | remove | ban | transfer
			Role     string `json:"role"`
			Reason   string `json:"reason"`
			BanHours int    `json:"ban_hours"`
		}
		if !decode(r, &body) || body.UserID == "" {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var err error
		switch body.Action {
		case "add":
			err = groups.AddMember(c.db, groupID, c.userID(), body.UserID)
		case "approve":
			err = groups.ApproveRequest(c.db, groupID, c.userID(), body.UserID, true)
		case "decline":
			err = groups.ApproveRequest(c.db, groupID, c.userID(), body.UserID, false)
		case "role":
			err = groups.SetRole(c.db, groupID, c.userID(), body.UserID, body.Role)
		case "remove":
			err = groups.RemoveMember(c.db, groupID, c.userID(), body.UserID, body.Reason, false, 0)
		case "ban":
			err = groups.RemoveMember(c.db, groupID, c.userID(), body.UserID, body.Reason, true,
				time.Duration(body.BanHours)*time.Hour)
		case "transfer":
			err = groups.TransferOwnership(c.db, groupID, c.userID(), body.UserID)
		default:
			respond.Error(w, http.StatusBadRequest, "unknown action")
			return
		}
		if err != nil {
			status := http.StatusForbidden
			if err == groups.ErrNotFound {
				status = http.StatusNotFound
			}
			respond.Error(w, status, err.Error())
			return
		}
		respond.OK(w, map[string]any{"updated": true})

	case http.MethodPut:
		// A member changing their own notification level.
		var body struct {
			Level string `json:"notification_level"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if !groups.MembershipFor(c.db, groupID, c.userID()).IsActive() {
			respond.Error(w, http.StatusForbidden, "you are not a member")
			return
		}
		if err := groups.SetNotificationLevel(c.db, groupID, c.userID(), body.Level); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not save that")
			return
		}
		respond.OK(w, map[string]any{"updated": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleGroupInvites(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodPost:
		// Redeeming a code is the unauthenticated-ish path: any signed-in user
		// with a valid code may join.
		var body struct {
			Code     string `json:"code"`
			GroupID  string `json:"group_id"`
			MaxUses  int    `json:"max_uses"`
			TTLHours int    `json:"ttl_hours"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if body.Code != "" {
			group, err := groups.RedeemInvite(c.db, body.Code, c.userID())
			if err != nil {
				respond.Error(w, http.StatusBadRequest, err.Error())
				return
			}
			analytics.Track(c.db, c.userID(), analytics.GroupJoined, "group", group.ID,
				analytics.Props{"source": "invite"})
			respond.OK(w, map[string]any{
				"group": toGroupView(group, groups.MembershipFor(c.db, group.ID, c.userID())),
			})
			return
		}

		if body.GroupID == "" {
			respond.Error(w, http.StatusBadRequest, "group_id or code is required")
			return
		}
		invite, err := groups.CreateInvite(c.db, body.GroupID, c.userID(),
			body.MaxUses, time.Duration(body.TTLHours)*time.Hour)
		if err != nil {
			respond.Error(w, http.StatusForbidden, err.Error())
			return
		}
		respond.Created(w, map[string]any{"invite": invite})

	case http.MethodGet:
		groupID := queryTarget(r)
		if !groups.MembershipFor(c.db, groupID, c.userID()).CanAdminister() {
			respond.Error(w, http.StatusForbidden, "you cannot manage invites for this group")
			return
		}
		var invites []models.GroupInvite
		c.db.Where("group_id = ? AND deleted_at IS NULL AND revoked_at IS NULL", groupID).
			Order("created_at desc").Limit(20).Find(&invites)
		respond.OK(w, map[string]any{"invites": invites})

	case http.MethodDelete:
		if err := groups.RevokeInvite(c.db, queryTarget(r), c.userID()); err != nil {
			respond.Error(w, http.StatusForbidden, err.Error())
			return
		}
		respond.OK(w, map[string]any{"revoked": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleGroupPosts lists a group's feed, gated on membership.
func handleGroupPosts(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	groupID := queryTarget(r)
	var group models.Group
	if err := c.db.Where("id = ? AND deleted_at IS NULL", groupID).First(&group).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "not found")
		return
	}
	m := groups.MembershipFor(c.db, groupID, c.userID())
	if !groups.CanReadPosts(&group, m, c.isStaff()) {
		respond.Error(w, http.StatusForbidden, "join this group to read its posts")
		return
	}

	limit, offset := paginate(r)
	q := c.db.Model(&models.Post{}).
		Where("group_id = ? AND deleted_at IS NULL AND moderation_status = ?", groupID, "active")
	if blocked := socialgraph.BlockedIDs(c.db, c.userID()); len(blocked) > 0 {
		q = q.Where("author_id NOT IN ?", blocked)
	}

	var total int64
	q.Count(&total)

	var posts []models.Post
	q.Order("created_at desc").Limit(limit).Offset(offset).Find(&posts)

	authorIDs := make([]string, 0, len(posts))
	postIDs := make([]string, 0, len(posts))
	for i := range posts {
		authorIDs = append(authorIDs, posts[i].AuthorID)
		postIDs = append(postIDs, posts[i].ID)
	}
	respond.OK(w, map[string]any{
		"posts":     posts,
		"authors":   loadUserSummaries(c.db, authorIDs),
		"reactions": reactions.SummariesFor(c.db, reactions.SubjectPost, postIDs, c.userID()),
		"total":     total,
		"has_more":  int64(offset+limit) < total,
	})
}

// ── Communities ───────────────────────────────────────────────────────────────

func handleCommunities(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodGet:
		if id := queryTarget(r); id != "" {
			var community models.Community
			if err := c.db.Where("id = ? AND deleted_at IS NULL", id).First(&community).Error; err != nil {
				respond.Error(w, http.StatusNotFound, "not found")
				return
			}
			isMember := groups.CanAdministerCommunity(c.db, id, c.userID())
			if community.Visibility == groups.VisibilityPrivate && !isMember && !c.isStaff() {
				respond.Error(w, http.StatusNotFound, "not found")
				return
			}
			var spaces []models.Group
			c.db.Where("community_id = ? AND deleted_at IS NULL AND status = ?", id, "active").
				Order("members_count desc").Find(&spaces)

			ids := make([]string, 0, len(spaces))
			for i := range spaces {
				ids = append(ids, spaces[i].ID)
			}
			memberships := groups.MembershipsFor(c.db, c.userID(), ids)
			views := make([]groupView, 0, len(spaces))
			for i := range spaces {
				g := spaces[i]
				gm := memberships[g.ID]
				if groups.CanSeeGroup(&g, gm, c.isStaff()) {
					views = append(views, toGroupView(g, gm))
				}
			}
			respond.OK(w, map[string]any{"community": community, "spaces": views})
			return
		}

		limit, offset := paginate(r)
		q := c.db.Model(&models.Community{}).
			Where("deleted_at IS NULL AND status = ? AND visibility <> ?", "active", groups.VisibilityPrivate)
		if query := r.URL.Query().Get("q"); query != "" {
			like := "%" + strings.ToLower(query) + "%"
			q = q.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", like, like)
		}
		var total int64
		q.Count(&total)
		var list []models.Community
		q.Order("members_count desc").Limit(limit).Offset(offset).Find(&list)
		respond.OK(w, map[string]any{
			"communities": list, "total": total, "has_more": int64(offset+limit) < total,
		})

	case http.MethodPost:
		if rateLimited(w, c, ratelimit.ActionGroupCreate) {
			return
		}
		var body struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Category    string `json:"category"`
			Visibility  string `json:"visibility"`
			AvatarURL   string `json:"avatar_url"`
			CoverURL    string `json:"cover_url"`
		}
		if !decode(r, &body) {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		community, err := groups.CreateCommunity(c.db, groups.CreateCommunityInput{
			CreatorID: c.userID(), Name: body.Name, Description: body.Description,
			Category: body.Category, Visibility: body.Visibility,
			AvatarURL: body.AvatarURL, CoverURL: body.CoverURL,
		})
		if err != nil {
			respond.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		analytics.Track(c.db, c.userID(), analytics.CommunityJoined, "community", community.ID, nil)
		respond.Created(w, map[string]any{"community": community})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── Real-time stream (Server-Sent Events) ─────────────────────────────────────

// Why SSE and not WebSockets: Vercel serverless functions cannot hold a
// WebSocket — there is no long-lived process to own one, and the platform
// offers no upgrade path. SSE is the transport that genuinely works here.
//
// The shape of the compromise, stated plainly: a function may run for at most
// `streamBudget`, so this handler streams events for that long and then closes
// cleanly. The browser's EventSource reconnects automatically, and Last-Event-ID
// resumes exactly where the previous connection stopped, so no event is lost
// across the seam.
//
// Compared with the polling it replaces (every 5-15 seconds from the client)
// this delivers an event within `pollInterval` of it being written, on one
// connection instead of a request per tick — which matters a great deal on
// Nigerian mobile data.
const (
	// streamBudget stays well inside the 30s function limit so the final
	// close-frame always makes it out.
	streamBudget = 25 * time.Second
	// pollInterval is how often the stream checks for new rows. Two seconds is
	// the point where a person perceives "instant" while the database load
	// stays trivial (two indexed queries per connected user per interval).
	pollInterval = 2 * time.Second
	// heartbeatInterval keeps intermediaries from closing an idle connection.
	heartbeatInterval = 15 * time.Second
)

// streamEvent is one message on the wire.
type streamEvent struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Data any    `json:"data"`
}

func handleStream(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		// Without flushing, SSE would buffer until the function ended and
		// deliver everything at once — worse than polling. Say so rather than
		// pretending to stream.
		respond.Error(w, http.StatusInternalServerError, "streaming is not available here")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	// Defeats proxy buffering, which otherwise holds the stream until close.
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	// Resume point. EventSource replays Last-Event-ID on reconnect, so the
	// seam between two 25-second windows loses nothing.
	since := time.Now()
	if raw := r.Header.Get("Last-Event-ID"); raw != "" {
		if parsed, err := time.Parse(time.RFC3339Nano, raw); err == nil {
			since = parsed
		}
	} else if raw := r.URL.Query().Get("since"); raw != "" {
		if parsed, err := time.Parse(time.RFC3339Nano, raw); err == nil {
			since = parsed
		}
	}
	// Never replay more than a short backlog: a client returning after hours
	// should fetch state normally, not receive a flood.
	if oldest := time.Now().Add(-5 * time.Minute); since.Before(oldest) {
		since = oldest
	}

	send := func(ev streamEvent) bool {
		payload, err := json.Marshal(ev.Data)
		if err != nil {
			return true
		}
		if _, err := fmt.Fprintf(w, "id: %s\nevent: %s\ndata: %s\n\n", ev.ID, ev.Type, payload); err != nil {
			return false // client is gone
		}
		flusher.Flush()
		return true
	}

	// Tell the client the stream is live, so the UI can show a connected state
	// rather than guessing.
	send(streamEvent{
		ID:   since.Format(time.RFC3339Nano),
		Type: "connected",
		Data: map[string]any{"since": since, "budget_ms": streamBudget.Milliseconds()},
	})

	deadline := time.After(streamBudget)
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()
	heartbeat := time.NewTicker(heartbeatInterval)
	defer heartbeat.Stop()

	userID := c.userID()
	ctxDone := r.Context().Done()

	for {
		select {
		case <-ctxDone:
			return // the client disconnected

		case <-deadline:
			// Hand the resume point back before closing, so the reconnect
			// picks up exactly here.
			send(streamEvent{
				ID:   since.Format(time.RFC3339Nano),
				Type: "reconnect",
				Data: map[string]any{"since": since},
			})
			return

		case <-heartbeat.C:
			// A bare comment keeps proxies from timing the connection out.
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()

		case <-ticker.C:
			latest := since
			for _, ev := range collectEvents(c.db, userID, since) {
				if !send(ev) {
					return
				}
				if t, err := time.Parse(time.RFC3339Nano, ev.ID); err == nil && t.After(latest) {
					latest = t
				}
			}
			since = latest
		}
	}
}

// collectEvents gathers everything the user should learn about since `since`.
//
// Two indexed queries per tick. Both are bounded, so a burst cannot produce an
// unbounded frame.
func collectEvents(db *gorm.DB, userID string, since time.Time) []streamEvent {
	out := []streamEvent{}
	if db == nil || userID == "" {
		return out
	}

	// New notifications (reactions, comments, mentions, follows, moderation).
	var notes []models.Notification
	db.Where("user_id = ? AND deleted_at IS NULL AND (created_at > ? OR updated_at > ?)",
		userID, since, since).
		Order("created_at asc").Limit(25).Find(&notes)
	for i := range notes {
		n := notes[i]
		stamp := n.CreatedAt
		if n.UpdatedAt.After(stamp) {
			stamp = n.UpdatedAt // a grouped notification updates in place
		}
		out = append(out, streamEvent{
			ID:   stamp.Format(time.RFC3339Nano),
			Type: "notification",
			Data: map[string]any{
				"id": n.ID, "type": n.Type, "title": n.Title, "body": n.Body,
				"link": n.Link, "is_read": n.IsRead, "actor_count": n.ActorCount,
				"subject_type": n.SubjectType, "subject_id": n.SubjectID,
				"created_at": n.CreatedAt,
			},
		})
	}

	// New direct messages.
	var messages []models.Message
	db.Where("receiver_id = ? AND deleted_at IS NULL AND created_at > ?", userID, since).
		Order("created_at asc").Limit(25).Find(&messages)
	for i := range messages {
		m := messages[i]
		out = append(out, streamEvent{
			ID:   m.CreatedAt.Format(time.RFC3339Nano),
			Type: "message",
			Data: map[string]any{
				"id": m.ID, "sender_id": m.SenderID,
				"content":    textparse.Excerpt(m.Content, 200),
				"media_type": m.MediaType, "created_at": m.CreatedAt,
			},
		})
	}

	// Stable ordering, so a client applying events in sequence sees them in
	// the order they happened rather than the order the queries returned.
	sort.SliceStable(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// ── Push notifications ────────────────────────────────────────────────────────

// handlePushKey returns the public VAPID key the browser needs to subscribe.
//
// Returning a clear "not configured" rather than an empty key matters: the
// client can then fall back to in-app notifications instead of failing at
// subscribe time with an opaque browser error.
func handlePushKey(w http.ResponseWriter, r *http.Request, c *ctx) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	key := os.Getenv("VAPID_PUBLIC_KEY")
	respond.OK(w, map[string]any{
		"public_key": key,
		"configured": key != "",
	})
}

// handlePushSubscribe stores or removes a browser push subscription.
func handlePushSubscribe(w http.ResponseWriter, r *http.Request, c *ctx) {
	switch r.Method {
	case http.MethodPost:
		var body struct {
			Endpoint  string `json:"endpoint"`
			P256dh    string `json:"p256dh"`
			Auth      string `json:"auth"`
			UserAgent string `json:"user_agent"`
		}
		if !decode(r, &body) || body.Endpoint == "" || body.P256dh == "" || body.Auth == "" {
			respond.Error(w, http.StatusBadRequest, "a complete subscription is required")
			return
		}
		sub := models.PushSubscription{
			UserID: c.userID(), Endpoint: body.Endpoint,
			P256dh: body.P256dh, Auth: body.Auth,
			UserAgent: textparse.Excerpt(body.UserAgent, 200),
		}
		// One row per endpoint: re-subscribing on the same device replaces the
		// keys rather than accumulating dead endpoints.
		if err := c.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "endpoint"}},
			DoUpdates: clause.Assignments(map[string]any{
				"user_id": c.userID(), "p256dh": body.P256dh,
				"auth": body.Auth, "failure_count": 0, "updated_at": time.Now(),
			}),
		}).Create(&sub).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not save that subscription")
			return
		}
		respond.Created(w, map[string]any{"subscribed": true})

	case http.MethodDelete:
		endpoint := r.URL.Query().Get("endpoint")
		if endpoint == "" {
			respond.Error(w, http.StatusBadRequest, "endpoint is required")
			return
		}
		c.db.Unscoped().Where("user_id = ? AND endpoint = ?", c.userID(), endpoint).
			Delete(&models.PushSubscription{})
		respond.OK(w, map[string]any{"subscribed": false})

	case http.MethodGet:
		var subs []models.PushSubscription
		c.db.Where("user_id = ?", c.userID()).Find(&subs)
		// Endpoints are device identifiers; return only what the client needs
		// to know whether THIS device is already subscribed.
		out := make([]map[string]any, 0, len(subs))
		for i := range subs {
			out = append(out, map[string]any{
				"endpoint": subs[i].Endpoint, "user_agent": subs[i].UserAgent,
				"created_at": subs[i].CreatedAt,
			})
		}
		respond.OK(w, map[string]any{"subscriptions": out})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
