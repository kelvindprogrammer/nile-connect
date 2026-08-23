package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"nile-connect/lib/analytics"
	"nile-connect/lib/db"
	"nile-connect/lib/feedrank"
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
	"nile-connect/lib/textparse"
)

// mediaItem is one attachment on a post.
type mediaItem struct {
	ID           string `json:"id"`
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnail_url,omitempty"`
	Kind         string `json:"kind"`
	Width        int    `json:"width,omitempty"`
	Height       int    `json:"height,omitempty"`
	DurationMs   int    `json:"duration_ms,omitempty"`
	AltText      string `json:"alt_text,omitempty"`
}

type authorSummary struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Type     string `json:"type"`
	Major    string `json:"major,omitempty"`
	Verified bool   `json:"is_verified"`
}

type postResponse struct {
	ID         string `json:"id"`
	AuthorID   string `json:"author_id"`
	AuthorType string `json:"author_type"`
	AuthorName string `json:"author_name,omitempty"`
	// Author is the richer shape; AuthorName is kept for the existing client.
	Author *authorSummary `json:"author,omitempty"`

	Content  string      `json:"content"`
	MediaUrl string      `json:"media_url,omitempty"`
	Media    []mediaItem `json:"media"`

	// Mentions/Hashtags are the parsed tokens, so the client highlights without
	// re-implementing the parser (and without us ever emitting HTML).
	Mentions []string `json:"mentions"`
	Hashtags []string `json:"hashtags"`

	LikesCount    int `json:"likes_count"` // legacy alias of reactions total
	CommentsCount int `json:"comments_count"`
	RepostsCount  int `json:"reposts_count"`

	Liked      bool              `json:"liked"` // legacy: any reaction by me
	Reactions  reactions.Summary `json:"reactions"`
	Bookmarked bool              `json:"bookmarked"`
	Reposted   bool              `json:"reposted"`

	JobID    *string `json:"job_id,omitempty"`
	Kind     string  `json:"kind"`
	Audience string  `json:"audience"`
	GroupID  *string `json:"group_id,omitempty"`

	// RepostOf/QuoteOf carry the embedded original. Only one is ever set.
	RepostOf *postResponse `json:"repost_of,omitempty"`
	QuoteOf  *postResponse `json:"quote_of,omitempty"`

	LinkURL   string  `json:"link_url,omitempty"`
	LinkTitle string  `json:"link_title,omitempty"`
	PollID    *string `json:"poll_id,omitempty"`

	CanDelete bool       `json:"can_delete"`
	EditedAt  *time.Time `json:"edited_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// Post kinds. Extended from the original four to cover the spec's richer
// vocabulary; every value is validated on write.
var allowedPostKinds = map[string]bool{
	"text": true, "job": true, "achievement": true, "announcement": true,
	"image": true, "video": true, "link": true, "poll": true,
	"question": true, "event": true, "resource": true, "study": true,
	"repost": true, "quote": true,
}

// staffOnlyKinds may not be posted by students.
var staffOnlyKinds = map[string]bool{"announcement": true}

const maxPostLength = 5000

type createPostRequest struct {
	Content  string  `json:"content"`
	MediaUrl string  `json:"media_url"`
	JobID    *string `json:"job_id"`
	Kind     string  `json:"kind"`

	Audience   string  `json:"audience"`
	GroupID    *string `json:"group_id"`
	RepostOfID *string `json:"repost_of_id"`
	QuoteOfID  *string `json:"quote_of_id"`
	LinkURL    string  `json:"link_url"`

	// Poll creates and attaches an interactive poll in the same request.
	Poll *struct {
		Question             string   `json:"question"`
		Options              []string `json:"options"`
		IsAnonymous          bool     `json:"is_anonymous"`
		MultiChoice          bool     `json:"multi_choice"`
		DurationHours        int      `json:"duration_hours"`
		HideResultsUntilVote bool     `json:"hide_results_until_vote"`
	} `json:"poll"`

	Media []struct {
		URL          string `json:"url"`
		ThumbnailURL string `json:"thumbnail_url"`
		Kind         string `json:"kind"`
		Width        int    `json:"width"`
		Height       int    `json:"height"`
		DurationMs   int    `json:"duration_ms"`
		AltText      string `json:"alt_text"`
	} `json:"media"`
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

	switch r.URL.Query().Get("path") {
	case "like":
		toggleLike(w, r, database)
		return
	case "comments":
		comments(w, r, database)
		return
	case "post":
		deletePost(w, r, database)
		return
	case "repost":
		toggleRepost(w, r, database)
		return
	}

	switch r.Method {
	case http.MethodGet:
		listFeed(w, r, database)
	case http.MethodPost:
		createPost(w, r, database)
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ── Feed read path ────────────────────────────────────────────────────────────

// listFeed builds the home feed.
//
// The previous implementation was `ORDER BY created_at DESC LIMIT 50` with no
// pagination, no privacy filtering and no ranking — every post visible to
// everyone. This version:
//
//  1. excludes blocked users inside the SQL, so filtering never shrinks a page
//     below its limit and pagination stays correct;
//  2. over-fetches a candidate window, applies the audience check per row, then
//     ranks and cuts to the page size;
//  3. hydrates authors, reactions, media and bookmarks in a fixed number of
//     batched queries regardless of page size.
func listFeed(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	viewerID := ""
	viewerRole := ""
	if auth, err := mw.Auth(r); err == nil {
		viewerID = auth.UserID
		viewerRole = auth.Role
	}

	limit := 20
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 && v <= 50 {
		limit = v
	}
	offset := 0
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v > 0 {
		offset = v
	}
	// "latest" is the user-facing escape hatch from ranking. Offering a real
	// chronological mode is a transparency requirement, not a nicety.
	mode := r.URL.Query().Get("mode")
	if mode != "latest" {
		mode = "ranked"
	}

	q := database.Model(&models.Post{}).
		Where("posts.deleted_at IS NULL").
		Where("posts.moderation_status = ? OR posts.moderation_status IS NULL", "active")

	// Blocks are applied in SQL. Doing this in Go after the fetch would return
	// short pages and make "has_more" wrong.
	if blocked := socialgraph.BlockedIDs(database, viewerID); len(blocked) > 0 {
		q = q.Where("posts.author_id NOT IN ?", blocked)
	}
	// Muted authors and explicitly hidden posts, likewise.
	if muted := socialgraph.MutedIDs(database, viewerID, "posts"); len(muted) > 0 {
		q = q.Where("posts.author_id NOT IN ?", muted)
	}
	if hidden := hiddenPostIDs(database, viewerID); len(hidden) > 0 {
		q = q.Where("posts.id NOT IN ?", hidden)
	}

	// Group posts only appear to members; they are excluded from the general
	// home feed and read through the group surface instead.
	q = q.Where("posts.group_id IS NULL")

	if author := r.URL.Query().Get("author_id"); author != "" {
		q = q.Where("posts.author_id = ?", author)
	}

	// Over-fetch so ranking has something to reorder and the audience filter
	// has slack to remove rows without emptying the page.
	window := (offset + limit) * 3
	if window < 60 {
		window = 60
	}
	if window > 400 {
		window = 400
	}

	var posts []models.Post
	if err := q.Order("posts.created_at desc").Limit(window).Find(&posts).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not fetch feed")
		return
	}

	// Resolve relations once for every author on the page.
	authorIDs := make([]string, 0, len(posts))
	for i := range posts {
		authorIDs = append(authorIDs, posts[i].AuthorID)
	}
	rels := socialgraph.ResolveMany(database, viewerID, authorIDs)

	// Apply the audience check per row. This is the server-side privacy
	// boundary — the client is never trusted to hide anything.
	visible := make([]models.Post, 0, len(posts))
	for i := range posts {
		p := posts[i]
		rel := rels[p.AuthorID]
		if p.AuthorID == viewerID {
			rel.IsSelf = true
		}
		if privacy.CanView(rel, p.Audience, privacy.ViewContext{}) {
			visible = append(visible, p)
		}
	}

	// Rank (or not).
	ordered := orderFeed(database, visible, rels, viewerID, mode)

	total := len(ordered)
	if offset >= total {
		respond.OK(w, map[string]any{
			"posts": []postResponse{}, "has_more": false, "mode": mode,
		})
		return
	}
	end := offset + limit
	if end > total {
		end = total
	}
	page := ordered[offset:end]

	result := hydratePosts(database, page, viewerID, viewerRole)

	respond.OK(w, map[string]any{
		"posts":       result,
		"has_more":    end < total,
		"next_offset": end,
		"mode":        mode,
	})
}

// orderFeed applies ranking or chronological order.
func orderFeed(database *gorm.DB, posts []models.Post, rels map[string]socialgraph.Relation, viewerID, mode string) []models.Post {
	byID := make(map[string]models.Post, len(posts))
	candidates := make([]feedrank.Candidate, 0, len(posts))

	notInterested := feedSignalSet(database, viewerID, "not_interested")

	for i := range posts {
		p := posts[i]
		byID[p.ID] = p
		rel := rels[p.AuthorID]
		if p.AuthorID == viewerID {
			rel.IsSelf = true
		}
		candidates = append(candidates, feedrank.Candidate{
			PostID:        p.ID,
			AuthorID:      p.AuthorID,
			CreatedAt:     p.CreatedAt,
			Affinity:      rel.Strength(),
			Reactions:     p.ReactionsCount,
			Comments:      p.CommentsCount,
			Reposts:       p.RepostsCount,
			TextLength:    len(p.Content),
			HasMedia:      p.MediaCount > 0 || p.MediaUrl != "",
			HasLink:       p.LinkURL != "",
			HasPoll:       p.PollID != nil,
			IsFollowed:    rel.Following,
			NotInterested: notInterested[p.ID],
		})
	}

	var orderedIDs []string
	if mode == "latest" {
		orderedIDs = feedrank.ChronologicalIDs(candidates)
	} else {
		for _, s := range feedrank.Rank(candidates, time.Now(), feedrank.DefaultWeights) {
			orderedIDs = append(orderedIDs, s.PostID)
		}
	}

	out := make([]models.Post, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		if p, ok := byID[id]; ok {
			out = append(out, p)
		}
	}
	return out
}

// hiddenPostIDs returns posts the viewer explicitly hid.
func hiddenPostIDs(database *gorm.DB, viewerID string) []string {
	if viewerID == "" {
		return nil
	}
	var ids []string
	database.Model(&models.FeedSignal{}).
		Where("user_id = ? AND signal = ? AND subject_type = ?", viewerID, "hide_post", "post").
		Pluck("subject_id", &ids)
	return ids
}

func feedSignalSet(database *gorm.DB, viewerID, signal string) map[string]bool {
	out := map[string]bool{}
	if viewerID == "" {
		return out
	}
	var ids []string
	database.Model(&models.FeedSignal{}).
		Where("user_id = ? AND signal = ?", viewerID, signal).
		Pluck("subject_id", &ids)
	for _, id := range ids {
		out[id] = true
	}
	return out
}

// hydratePosts turns post rows into responses using a fixed number of batched
// queries: authors, reactions, media, bookmarks, reposts and embedded
// originals — six queries for a page of any size, not six per post.
func hydratePosts(database *gorm.DB, posts []models.Post, viewerID, viewerRole string) []postResponse {
	if len(posts) == 0 {
		return []postResponse{}
	}

	postIDs := make([]string, 0, len(posts))
	authorIDs := make([]string, 0, len(posts))
	embeddedIDs := make([]string, 0)
	for i := range posts {
		postIDs = append(postIDs, posts[i].ID)
		authorIDs = append(authorIDs, posts[i].AuthorID)
		if posts[i].RepostOfID != nil {
			embeddedIDs = append(embeddedIDs, *posts[i].RepostOfID)
		}
		if posts[i].QuoteOfID != nil {
			embeddedIDs = append(embeddedIDs, *posts[i].QuoteOfID)
		}
	}

	authors := loadAuthors(database, append(authorIDs, embeddedAuthorIDs(database, embeddedIDs)...))
	reactionSummaries := reactions.SummariesFor(database, reactions.SubjectPost, postIDs, viewerID)
	mediaByPost := loadMedia(database, postIDs)
	bookmarked := bookmarkedSet(database, viewerID, postIDs)
	repostedOriginals := repostedSet(database, viewerID, postIDs)
	embedded := loadEmbedded(database, embeddedIDs, viewerID)

	out := make([]postResponse, 0, len(posts))
	for i := range posts {
		p := posts[i]
		pr := toPostResponse(&p)

		if a, ok := authors[p.AuthorID]; ok {
			pr.AuthorName = a.Name
			pr.Author = &a
		}
		pr.Media = mediaByPost[p.ID]
		if pr.Media == nil {
			pr.Media = []mediaItem{}
		}
		pr.Reactions = reactionSummaries[p.ID]
		pr.Liked = pr.Reactions.Mine != ""
		pr.LikesCount = pr.Reactions.Total
		pr.Bookmarked = bookmarked[p.ID]
		pr.CanDelete = p.AuthorID == viewerID || viewerRole == "staff"

		parsed := textparse.Parse(p.Content)
		pr.Mentions = parsed.Handles
		pr.Hashtags = parsed.Tags

		if p.RepostOfID != nil {
			if orig, ok := embedded[*p.RepostOfID]; ok {
				pr.RepostOf = &orig
			}
			pr.Reposted = true
		}
		if p.QuoteOfID != nil {
			if orig, ok := embedded[*p.QuoteOfID]; ok {
				pr.QuoteOf = &orig
			}
		}
		// "Reposted" on an original post means the VIEWER has reposted it.
		if p.RepostOfID == nil {
			pr.Reposted = repostedOriginals[p.ID]
		}

		out = append(out, pr)
	}
	return out
}

func embeddedAuthorIDs(database *gorm.DB, ids []string) []string {
	if len(ids) == 0 {
		return nil
	}
	var out []string
	database.Model(&models.Post{}).Where("id IN ?", ids).Pluck("author_id", &out)
	return out
}

func loadAuthors(database *gorm.DB, ids []string) map[string]authorSummary {
	out := map[string]authorSummary{}
	if len(ids) == 0 {
		return out
	}
	var users []models.User
	database.Where("id IN ? AND deleted_at IS NULL", ids).Find(&users)
	for i := range users {
		u := users[i]
		out[u.ID] = authorSummary{
			ID: u.ID, Name: u.FullName, Username: u.Username,
			Type: u.Role, Major: u.Major, Verified: u.IsVerified,
		}
	}
	return out
}

func loadMedia(database *gorm.DB, postIDs []string) map[string][]mediaItem {
	out := map[string][]mediaItem{}
	if len(postIDs) == 0 {
		return out
	}
	var rows []models.PostMedia
	database.Where("post_id IN ? AND deleted_at IS NULL", postIDs).
		Order("position asc").Find(&rows)
	for i := range rows {
		m := rows[i]
		out[m.PostID] = append(out[m.PostID], mediaItem{
			ID: m.ID, URL: m.URL, ThumbnailURL: m.ThumbnailURL, Kind: m.Kind,
			Width: m.Width, Height: m.Height, DurationMs: m.DurationMs, AltText: m.AltText,
		})
	}
	return out
}

func bookmarkedSet(database *gorm.DB, viewerID string, postIDs []string) map[string]bool {
	out := map[string]bool{}
	if viewerID == "" || len(postIDs) == 0 {
		return out
	}
	var ids []string
	database.Model(&models.Bookmark{}).
		Where("user_id = ? AND subject_type = ? AND subject_id IN ?", viewerID, "post", postIDs).
		Pluck("subject_id", &ids)
	for _, id := range ids {
		out[id] = true
	}
	return out
}

func repostedSet(database *gorm.DB, viewerID string, postIDs []string) map[string]bool {
	out := map[string]bool{}
	if viewerID == "" || len(postIDs) == 0 {
		return out
	}
	var ids []string
	database.Model(&models.Post{}).
		Where("author_id = ? AND repost_of_id IN ? AND deleted_at IS NULL", viewerID, postIDs).
		Pluck("repost_of_id", &ids)
	for _, id := range ids {
		out[id] = true
	}
	return out
}

// loadEmbedded fetches the originals behind reposts and quotes.
//
// An embedded original is rendered WITHOUT re-checking its audience against
// the viewer, because a repost is a deliberate republication by the reposter.
// To avoid that becoming a privacy hole, createPost refuses to repost anything
// that is not "everyone"-visible in the first place.
func loadEmbedded(database *gorm.DB, ids []string, viewerID string) map[string]postResponse {
	out := map[string]postResponse{}
	if len(ids) == 0 {
		return out
	}
	var posts []models.Post
	database.Where("id IN ? AND deleted_at IS NULL AND moderation_status = ?", ids, "active").Find(&posts)
	if len(posts) == 0 {
		return out
	}

	authorIDs := make([]string, 0, len(posts))
	innerIDs := make([]string, 0, len(posts))
	for i := range posts {
		authorIDs = append(authorIDs, posts[i].AuthorID)
		innerIDs = append(innerIDs, posts[i].ID)
	}
	authors := loadAuthors(database, authorIDs)
	media := loadMedia(database, innerIDs)
	summaries := reactions.SummariesFor(database, reactions.SubjectPost, innerIDs, viewerID)

	for i := range posts {
		p := posts[i]
		pr := toPostResponse(&p)
		if a, ok := authors[p.AuthorID]; ok {
			pr.AuthorName = a.Name
			pr.Author = &a
		}
		pr.Media = media[p.ID]
		if pr.Media == nil {
			pr.Media = []mediaItem{}
		}
		pr.Reactions = summaries[p.ID]
		pr.LikesCount = pr.Reactions.Total
		parsed := textparse.Parse(p.Content)
		pr.Mentions = parsed.Handles
		pr.Hashtags = parsed.Tags
		out[p.ID] = pr
	}
	return out
}

func toPostResponse(p *models.Post) postResponse {
	kind := p.Kind
	if kind == "" {
		kind = "text"
	}
	audience := p.Audience
	if audience == "" {
		audience = privacy.AudienceEveryone
	}
	return postResponse{
		ID:            p.ID,
		AuthorID:      p.AuthorID,
		AuthorType:    p.AuthorType,
		Content:       p.Content,
		MediaUrl:      p.MediaUrl,
		Media:         []mediaItem{},
		Mentions:      []string{},
		Hashtags:      []string{},
		LikesCount:    p.LikesCount,
		CommentsCount: p.CommentsCount,
		RepostsCount:  p.RepostsCount,
		JobID:         p.JobID,
		Kind:          kind,
		Audience:      audience,
		GroupID:       p.GroupID,
		LinkURL:       p.LinkURL,
		LinkTitle:     p.LinkTitle,
		PollID:        p.PollID,
		EditedAt:      p.EditedAt,
		CreatedAt:     p.CreatedAt,
	}
}

// ── Feed write path ───────────────────────────────────────────────────────────

func createPost(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	// A restricted account cannot post. Checked server-side: hiding the
	// composer in the UI is not a restriction.
	restrictions := moderation.ActiveRestrictions(database, auth.UserID)
	if !restrictions.CanPost() {
		respond.Error(w, http.StatusForbidden, restrictions.RestrictionMessage("post"))
		return
	}
	if d := ratelimit.Check(database, auth.UserID, ratelimit.ActionPost); !d.Allowed {
		w.Header().Set("Retry-After", strconv.Itoa(d.RetryAfterSeconds()))
		respond.Error(w, http.StatusTooManyRequests, d.Message)
		return
	}

	var req createPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Content = strings.TrimSpace(req.Content)

	kind := req.Kind
	if kind == "" {
		kind = "text"
	}
	if !allowedPostKinds[kind] {
		respond.Error(w, http.StatusBadRequest, "invalid kind")
		return
	}
	if staffOnlyKinds[kind] && auth.Role == "student" {
		respond.Error(w, http.StatusForbidden, "only employers and staff can post announcements")
		return
	}
	if len([]rune(req.Content)) > maxPostLength {
		respond.Error(w, http.StatusBadRequest,
			fmt.Sprintf("posts are limited to %d characters", maxPostLength))
		return
	}
	if req.RepostOfID != nil && req.QuoteOfID != nil {
		respond.Error(w, http.StatusBadRequest, "a post cannot be both a repost and a quote")
		return
	}

	isRepost := req.RepostOfID != nil && *req.RepostOfID != ""
	isQuote := req.QuoteOfID != nil && *req.QuoteOfID != ""

	// A bare repost carries no content of its own; everything else needs
	// something in it.
	hasPoll := req.Poll != nil && strings.TrimSpace(req.Poll.Question) != ""
	if !isRepost && !hasPoll && req.Content == "" && len(req.Media) == 0 && req.MediaUrl == "" {
		respond.Error(w, http.StatusBadRequest, "content is required")
		return
	}
	if kind == "job" && (req.JobID == nil || *req.JobID == "") {
		respond.Error(w, http.StatusBadRequest, "job_id is required for a job share")
		return
	}

	// Reposting/quoting is only allowed on content that is public to begin
	// with. Without this a repost would launder a connections-only post into
	// the public feed.
	var originalID string
	if isRepost {
		originalID = *req.RepostOfID
	} else if isQuote {
		originalID = *req.QuoteOfID
	}
	var original models.Post
	if originalID != "" {
		if err := database.Where("id = ? AND deleted_at IS NULL AND moderation_status = ?",
			originalID, "active").First(&original).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "that post is no longer available")
			return
		}
		if original.Audience != privacy.AudienceEveryone {
			respond.Error(w, http.StatusForbidden, "that post cannot be reshared")
			return
		}
		if socialgraph.IsBlockedEither(database, auth.UserID, original.AuthorID) {
			respond.Error(w, http.StatusForbidden, "that post cannot be reshared")
			return
		}
		// Reposting a repost points at the original, so chains stay one level
		// deep and the feed never renders a russian doll of embeds.
		if original.RepostOfID != nil {
			originalID = *original.RepostOfID
		}
	}

	// Duplicate reposts are refused rather than stacked.
	if isRepost {
		var existing int64
		database.Model(&models.Post{}).
			Where("author_id = ? AND repost_of_id = ? AND deleted_at IS NULL", auth.UserID, originalID).
			Count(&existing)
		if existing > 0 {
			respond.Error(w, http.StatusConflict, "you have already reposted this")
			return
		}
	}

	settings := privacy.SettingsFor(database, auth.UserID)
	audience := privacy.NormalizeAudience(req.Audience, settings.DefaultPostAudience)

	// Group posts derive their audience from membership, and require it.
	if req.GroupID != nil && *req.GroupID != "" {
		if !isActiveGroupMember(database, *req.GroupID, auth.UserID) {
			respond.Error(w, http.StatusForbidden, "you are not a member of that group")
			return
		}
		audience = privacy.AudienceGroup
	}

	// A poll is created BEFORE the post so the post can reference it. If the
	// poll is rejected the post is never written, rather than leaving a
	// poll-kind post pointing at nothing.
	var pollID *string
	if hasPoll {
		created, err := polls.Create(database, polls.CreateInput{
			AuthorID:             auth.UserID,
			Question:             req.Poll.Question,
			Options:              req.Poll.Options,
			IsAnonymous:          req.Poll.IsAnonymous,
			MultiChoice:          req.Poll.MultiChoice,
			DurationHours:        req.Poll.DurationHours,
			HideResultsUntilVote: req.Poll.HideResultsUntilVote,
		})
		if err != nil {
			respond.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		pollID = &created.ID
		kind = "poll"
	}

	post := models.Post{
		AuthorID:         auth.UserID,
		AuthorType:       auth.Role,
		Content:          req.Content,
		MediaUrl:         req.MediaUrl,
		JobID:            req.JobID,
		Kind:             kind,
		Audience:         audience,
		GroupID:          req.GroupID,
		LinkURL:          strings.TrimSpace(req.LinkURL),
		MediaCount:       len(req.Media),
		PollID:           pollID,
		ModerationStatus: "active",
	}
	if isRepost {
		post.RepostOfID = &originalID
		post.Kind = "repost"
	}
	if isQuote {
		post.QuoteOfID = &originalID
		post.Kind = "quote"
	}

	err = database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&post).Error; err != nil {
			return err
		}
		for i, m := range req.Media {
			if strings.TrimSpace(m.URL) == "" {
				continue
			}
			if err := tx.Create(&models.PostMedia{
				PostID: post.ID, URL: m.URL, ThumbnailURL: m.ThumbnailURL,
				Kind: m.Kind, Width: m.Width, Height: m.Height,
				DurationMs: m.DurationMs, AltText: textparse.Excerpt(m.AltText, 300),
				Position: i,
			}).Error; err != nil {
				return err
			}
		}
		if originalID != "" {
			col := "reposts_count"
			if isQuote {
				col = "quotes_count"
			}
			if err := tx.Model(&models.Post{}).Where("id = ?", originalID).
				UpdateColumn(col, gorm.Expr(col+" + 1")).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create post")
		return
	}

	// Mentions and hashtags are indexed outside the transaction: they are
	// enrichment, and a failure there must not lose the user's post.
	indexMentionsAndTags(database, auth.UserID, "post", post.ID, post.Content)
	if originalID != "" {
		notifyRepost(database, auth.UserID, original.AuthorID, post.ID, isQuote)
	}

	analytics.Track(database, auth.UserID, analytics.PostCreated, "post", post.ID, analytics.Props{
		"kind":        post.Kind,
		"audience":    post.Audience,
		"media_count": post.MediaCount,
		"has_link":    post.LinkURL != "",
		"is_repost":   isRepost,
		"is_quote":    isQuote,
		"text_length": len(post.Content),
	})

	page := hydratePosts(database, []models.Post{post}, auth.UserID, auth.Role)
	if len(page) == 0 {
		respond.Created(w, toPostResponse(&post))
		return
	}
	respond.Created(w, page[0])
}

func isActiveGroupMember(database *gorm.DB, groupID, userID string) bool {
	var n int64
	database.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ? AND status = ?", groupID, userID, "active").
		Count(&n)
	return n > 0
}

// indexMentionsAndTags parses user text and records the mentions and hashtags,
// then notifies the people who may legitimately be mentioned.
//
// Privacy is enforced here, not in the client: someone who limits who may
// mention them is never notified by a stranger, and a blocked user cannot
// reach their blocker through an @.
func indexMentionsAndTags(database *gorm.DB, actorID, subjectType, subjectID, content string) {
	parsed := textparse.Parse(content)

	if len(parsed.Handles) > 0 {
		var users []models.User
		database.Where("LOWER(username) IN ? AND deleted_at IS NULL", parsed.Handles).Find(&users)
		ids := make([]string, 0, len(users))
		nameByID := map[string]string{}
		for i := range users {
			ids = append(ids, users[i].ID)
			nameByID[users[i].ID] = users[i].FullName
		}
		allowed, _ := privacy.FilterMentionable(database, actorID, ids)
		for _, id := range allowed {
			if id == actorID {
				continue
			}
			database.Create(&models.Mention{
				SubjectType: subjectType, SubjectID: subjectID,
				MentionedUserID: id, ActorID: actorID,
			})
			notify.Create(database, id, actorID, "mention",
				"You were mentioned",
				textparse.Excerpt(content, 120),
				"/student?post="+subjectID)
		}
	}

	// Hashtags are indexed for posts only; a tag on a comment does not create
	// a tag feed entry.
	if subjectType == "post" {
		for _, tag := range parsed.Tags {
			ht := models.Hashtag{Tag: tag, LastUsedAt: time.Now()}
			database.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "tag"}},
				DoUpdates: clause.Assignments(map[string]any{"last_used_at": time.Now()}),
			}).Create(&ht)
			if ht.ID == "" {
				database.Where("tag = ?", tag).First(&ht)
			}
			database.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "post_id"}, {Name: "tag"}},
				DoNothing: true,
			}).Create(&models.PostHashtag{PostID: subjectID, HashtagID: ht.ID, Tag: tag})
			database.Exec(`UPDATE hashtags SET posts_count = (
					SELECT COUNT(*) FROM post_hashtags WHERE tag = ?
				) WHERE tag = ?`, tag, tag)
		}
	}
}

func notifyRepost(database *gorm.DB, actorID, ownerID, postID string, isQuote bool) {
	if ownerID == "" || ownerID == actorID {
		return
	}
	if socialgraph.IsBlockedEither(database, actorID, ownerID) {
		return
	}
	var actor models.User
	name := "Someone"
	if database.Where("id = ?", actorID).First(&actor).Error == nil && actor.FullName != "" {
		name = actor.FullName
	}
	verb := "reposted"
	if isQuote {
		verb = "quoted"
	}
	notify.Grouped(database, notify.GroupedInput{
		UserID:      ownerID,
		ActorID:     actorID,
		Type:        "repost",
		GroupKey:    "repost:post:" + postID,
		Title:       name + " " + verb + " your post",
		OthersTitle: "%s and %d others " + verb + " your post",
		ActorName:   name,
		Link:        "/student?post=" + postID,
		SubjectType: "post",
		SubjectID:   postID,
	})
}

// toggleRepost is the one-tap repost/undo used by the feed card.
func toggleRepost(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	postID := r.URL.Query().Get("id")
	if postID == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}

	switch r.Method {
	case http.MethodPost:
		restrictions := moderation.ActiveRestrictions(database, auth.UserID)
		if !restrictions.CanPost() {
			respond.Error(w, http.StatusForbidden, restrictions.RestrictionMessage("repost"))
			return
		}
		var original models.Post
		if err := database.Where("id = ? AND deleted_at IS NULL AND moderation_status = ?",
			postID, "active").First(&original).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "that post is no longer available")
			return
		}
		if original.Audience != privacy.AudienceEveryone ||
			socialgraph.IsBlockedEither(database, auth.UserID, original.AuthorID) {
			respond.Error(w, http.StatusForbidden, "that post cannot be reshared")
			return
		}
		target := original.ID
		if original.RepostOfID != nil {
			target = *original.RepostOfID
		}

		var existing int64
		database.Model(&models.Post{}).
			Where("author_id = ? AND repost_of_id = ? AND deleted_at IS NULL", auth.UserID, target).
			Count(&existing)
		if existing > 0 {
			respond.Error(w, http.StatusConflict, "you have already reposted this")
			return
		}

		repost := models.Post{
			AuthorID: auth.UserID, AuthorType: auth.Role, Kind: "repost",
			Audience: privacy.AudienceEveryone, RepostOfID: &target,
			ModerationStatus: "active",
		}
		if err := database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&repost).Error; err != nil {
				return err
			}
			return recountReposts(tx, target)
		}); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not repost")
			return
		}
		notifyRepost(database, auth.UserID, original.AuthorID, target, false)
		analytics.Track(database, auth.UserID, analytics.PostReposted, "post", target, nil)
		respond.OK(w, map[string]any{"reposted": true, "reposts_count": repostCount(database, target)})

	case http.MethodDelete:
		if err := database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Where("author_id = ? AND repost_of_id = ?", auth.UserID, postID).
				Delete(&models.Post{}).Error; err != nil {
				return err
			}
			return recountReposts(tx, postID)
		}); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not undo that repost")
			return
		}
		respond.OK(w, map[string]any{"reposted": false, "reposts_count": repostCount(database, postID)})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// recountReposts recomputes the counter from the rows rather than
// incrementing, so it cannot drift.
func recountReposts(tx *gorm.DB, postID string) error {
	return tx.Exec(`UPDATE posts SET reposts_count = (
			SELECT COUNT(*) FROM posts r WHERE r.repost_of_id = ? AND r.deleted_at IS NULL
		) WHERE id = ?`, postID, postID).Error
}

func repostCount(database *gorm.DB, postID string) int {
	var n int
	database.Model(&models.Post{}).Where("id = ?", postID).Select("reposts_count").Scan(&n)
	return n
}

// ── Reactions (legacy like endpoint) ──────────────────────────────────────────

// toggleLike is kept for the existing client. It now delegates to the reaction
// system so both paths write the same rows and the counters cannot diverge.
func toggleLike(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	postID := r.URL.Query().Get("id")
	if postID == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if d := ratelimit.Check(database, auth.UserID, ratelimit.ActionReaction); !d.Allowed {
		w.Header().Set("Retry-After", strconv.Itoa(d.RetryAfterSeconds()))
		respond.Error(w, http.StatusTooManyRequests, d.Message)
		return
	}

	var post models.Post
	if err := database.Where("id = ? AND deleted_at IS NULL AND moderation_status = ?",
		postID, "active").First(&post).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}
	// Reacting requires being able to see the post.
	rel := socialgraph.Resolve(database, auth.UserID, post.AuthorID)
	if !privacy.CanView(rel, post.Audience, privacy.ViewContext{}) {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}

	res, err := reactions.Toggle(database, reactions.SubjectPost, postID, auth.UserID, string(reactions.Like))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not save your reaction")
		return
	}

	if res.Added || res.Changed {
		var actor models.User
		if database.Where("id = ?", auth.UserID).First(&actor).Error == nil {
			notify.Grouped(database, notify.GroupedInput{
				UserID:      post.AuthorID,
				ActorID:     auth.UserID,
				Type:        "like",
				GroupKey:    "reaction:post:" + postID,
				Title:       actor.FullName + " reacted to your post",
				OthersTitle: "%s and %d others reacted to your post",
				ActorName:   actor.FullName,
				Link:        "/student?post=" + postID,
				SubjectType: "post",
				SubjectID:   postID,
			})
		}
	}

	analytics.Track(database, auth.UserID, analytics.PostReacted, "post", postID, analytics.Props{
		"reaction": string(res.Summary.Mine),
		"source":   "feed",
	})

	respond.OK(w, map[string]any{
		"liked":       res.Summary.Mine != "",
		"likes_count": res.Summary.Total,
		"reactions":   res.Summary,
	})
}

// ── Delete ────────────────────────────────────────────────────────────────────

func deletePost(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	if r.Method != http.MethodDelete {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	postID := r.URL.Query().Get("id")
	if postID == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var post models.Post
	if err := database.Where("id = ? AND deleted_at IS NULL", postID).First(&post).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}
	// A 404 rather than a 403 for someone else's post: telling a stranger the
	// post exists but is not theirs is an unnecessary disclosure.
	if post.AuthorID != auth.UserID && auth.Role != "staff" {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&post).Error; err != nil {
			return err
		}
		// Keep every derived counter honest.
		if post.RepostOfID != nil {
			if err := recountReposts(tx, *post.RepostOfID); err != nil {
				return err
			}
		}
		// Reposts of a deleted post become orphans that render as blanks, so
		// they go too.
		if err := tx.Where("repost_of_id = ?", postID).Delete(&models.Post{}).Error; err != nil {
			return err
		}
		// Tag counters must not keep counting a deleted post.
		var tags []string
		tx.Model(&models.PostHashtag{}).Where("post_id = ?", postID).Pluck("tag", &tags)
		if err := tx.Unscoped().Where("post_id = ?", postID).Delete(&models.PostHashtag{}).Error; err != nil {
			return err
		}
		for _, tag := range tags {
			tx.Exec(`UPDATE hashtags SET posts_count = (
					SELECT COUNT(*) FROM post_hashtags WHERE tag = ?
				) WHERE tag = ?`, tag, tag)
		}
		return nil
	}); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete post")
		return
	}
	respond.OK(w, map[string]any{"deleted": true})
}

// ── Comments ──────────────────────────────────────────────────────────────────

type commentResponse struct {
	ID         string   `json:"id"`
	PostID     string   `json:"post_id"`
	ParentID   *string  `json:"parent_id,omitempty"`
	AuthorID   string   `json:"author_id"`
	AuthorType string   `json:"author_type"`
	AuthorName string   `json:"author_name"`
	Content    string   `json:"content"`
	Mentions   []string `json:"mentions"`

	RepliesCount int               `json:"replies_count"`
	Reactions    reactions.Summary `json:"reactions"`
	CanDelete    bool              `json:"can_delete"`
	CreatedAt    time.Time         `json:"created_at"`
}

func comments(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	postID := r.URL.Query().Get("id")
	if postID == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		listComments(w, r, database, postID)
	case http.MethodPost:
		createComment(w, r, database, postID)
	case http.MethodDelete:
		deleteComment(w, r, database, postID)
	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func listComments(w http.ResponseWriter, r *http.Request, database *gorm.DB, postID string) {
	viewerID, viewerRole := "", ""
	if auth, err := mw.Auth(r); err == nil {
		viewerID, viewerRole = auth.UserID, auth.Role
	}

	// A comment thread is only as visible as its post.
	var post models.Post
	if err := database.Where("id = ? AND deleted_at IS NULL", postID).First(&post).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}
	rel := socialgraph.Resolve(database, viewerID, post.AuthorID)
	if !privacy.CanView(rel, post.Audience, privacy.ViewContext{ViewerIsModerator: viewerRole == "staff"}) {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}

	q := database.Model(&models.Comment{}).
		Where("post_id = ? AND deleted_at IS NULL", postID).
		Where("moderation_status = ? OR moderation_status IS NULL", "active")
	if blocked := socialgraph.BlockedIDs(database, viewerID); len(blocked) > 0 {
		q = q.Where("author_id NOT IN ?", blocked)
	}

	var rows []models.Comment
	q.Order("created_at asc").Limit(200).Find(&rows)

	ids := make([]string, 0, len(rows))
	authorIDs := make([]string, 0, len(rows))
	for i := range rows {
		ids = append(ids, rows[i].ID)
		authorIDs = append(authorIDs, rows[i].AuthorID)
	}
	authors := loadAuthors(database, authorIDs)
	summaries := reactions.SummariesFor(database, reactions.SubjectComment, ids, viewerID)

	out := make([]commentResponse, 0, len(rows))
	for i := range rows {
		cm := rows[i]
		parsed := textparse.Parse(cm.Content)
		name := "Someone"
		if a, ok := authors[cm.AuthorID]; ok {
			name = a.Name
		}
		out = append(out, commentResponse{
			ID: cm.ID, PostID: cm.PostID, ParentID: cm.ParentID,
			AuthorID: cm.AuthorID, AuthorType: cm.AuthorType, AuthorName: name,
			Content: cm.Content, Mentions: parsed.Handles,
			RepliesCount: cm.RepliesCount, Reactions: summaries[cm.ID],
			CanDelete: cm.AuthorID == viewerID || viewerRole == "staff",
			CreatedAt: cm.CreatedAt,
		})
	}
	respond.OK(w, map[string]any{"comments": out})
}

func createComment(w http.ResponseWriter, r *http.Request, database *gorm.DB, postID string) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	restrictions := moderation.ActiveRestrictions(database, auth.UserID)
	if !restrictions.CanComment() {
		respond.Error(w, http.StatusForbidden, restrictions.RestrictionMessage("comment"))
		return
	}
	if d := ratelimit.Check(database, auth.UserID, ratelimit.ActionComment); !d.Allowed {
		w.Header().Set("Retry-After", strconv.Itoa(d.RetryAfterSeconds()))
		respond.Error(w, http.StatusTooManyRequests, d.Message)
		return
	}

	var req struct {
		Content  string  `json:"content"`
		ParentID *string `json:"parent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		respond.Error(w, http.StatusBadRequest, "content is required")
		return
	}
	if len([]rune(req.Content)) > 2000 {
		respond.Error(w, http.StatusBadRequest, "comments are limited to 2000 characters")
		return
	}

	var post models.Post
	if err := database.Where("id = ? AND deleted_at IS NULL AND moderation_status = ?",
		postID, "active").First(&post).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}

	// Both checks matter: can I see this post, and does its author allow me to
	// comment?
	rel := socialgraph.Resolve(database, auth.UserID, post.AuthorID)
	if !privacy.CanView(rel, post.Audience, privacy.ViewContext{}) {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}
	authorSettings := privacy.SettingsFor(database, post.AuthorID)
	if !privacy.Can(rel, authorSettings, privacy.ActionComment) {
		respond.Error(w, http.StatusForbidden, "comments are limited on this post")
		return
	}

	// One level of nesting: a reply to a reply re-parents to the top-level
	// comment, so threads stay readable instead of marching off the screen.
	var parentID *string
	if req.ParentID != nil && *req.ParentID != "" {
		var parent models.Comment
		if err := database.Where("id = ? AND post_id = ? AND deleted_at IS NULL",
			*req.ParentID, postID).First(&parent).Error; err == nil {
			root := parent.ID
			if parent.ParentID != nil {
				root = *parent.ParentID
			}
			parentID = &root
		}
	}

	comment := models.Comment{
		PostID: postID, AuthorID: auth.UserID, AuthorType: auth.Role,
		Content: req.Content, ParentID: parentID, ModerationStatus: "active",
	}
	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&comment).Error; err != nil {
			return err
		}
		if err := tx.Exec(`UPDATE posts SET comments_count = (
				SELECT COUNT(*) FROM comments
				WHERE post_id = ? AND deleted_at IS NULL AND moderation_status = 'active'
			) WHERE id = ?`, postID, postID).Error; err != nil {
			return err
		}
		if parentID != nil {
			return tx.Exec(`UPDATE comments SET replies_count = (
					SELECT COUNT(*) FROM comments
					WHERE parent_id = ? AND deleted_at IS NULL AND moderation_status = 'active'
				) WHERE id = ?`, *parentID, *parentID).Error
		}
		return nil
	}); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create comment")
		return
	}

	indexMentionsAndTags(database, auth.UserID, "comment", comment.ID, comment.Content)

	authorName := "Someone"
	var actor models.User
	if database.Where("id = ?", auth.UserID).First(&actor).Error == nil {
		authorName = actor.FullName
		if !socialgraph.IsBlockedEither(database, auth.UserID, post.AuthorID) {
			notify.Grouped(database, notify.GroupedInput{
				UserID:      post.AuthorID,
				ActorID:     auth.UserID,
				Type:        "comment",
				GroupKey:    "comment:post:" + postID,
				Title:       authorName + " commented on your post",
				OthersTitle: "%s and %d others commented on your post",
				ActorName:   authorName,
				Body:        textparse.Excerpt(req.Content, 100),
				Link:        "/student?post=" + postID,
				SubjectType: "post",
				SubjectID:   postID,
			})
		}
	}

	respond.Created(w, commentResponse{
		ID: comment.ID, PostID: comment.PostID, ParentID: comment.ParentID,
		AuthorID: comment.AuthorID, AuthorType: comment.AuthorType,
		AuthorName: authorName, Content: comment.Content,
		Mentions:  textparse.Parse(comment.Content).Handles,
		Reactions: reactions.Summary{Counts: map[reactions.Kind]int{}, Top: []reactions.Kind{}},
		CanDelete: true,
		CreatedAt: comment.CreatedAt,
	})
}

func deleteComment(w http.ResponseWriter, r *http.Request, database *gorm.DB, postID string) {
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	commentID := r.URL.Query().Get("commentId")
	if commentID == "" {
		respond.Error(w, http.StatusBadRequest, "commentId is required")
		return
	}

	var comment models.Comment
	if err := database.Where("id = ? AND post_id = ? AND deleted_at IS NULL",
		commentID, postID).First(&comment).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "comment not found")
		return
	}
	// The post's author may also remove comments on their own post — the
	// minimum self-moderation any social product needs.
	var post models.Post
	database.Where("id = ?", postID).First(&post)
	if comment.AuthorID != auth.UserID && auth.Role != "staff" && post.AuthorID != auth.UserID {
		respond.Error(w, http.StatusNotFound, "comment not found")
		return
	}

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&comment).Error; err != nil {
			return err
		}
		// Replies to a deleted comment go with it, otherwise they render
		// orphaned under nothing.
		if comment.ParentID == nil {
			if err := tx.Where("parent_id = ?", commentID).Delete(&models.Comment{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Exec(`UPDATE posts SET comments_count = (
				SELECT COUNT(*) FROM comments
				WHERE post_id = ? AND deleted_at IS NULL AND moderation_status = 'active'
			) WHERE id = ?`, postID, postID).Error; err != nil {
			return err
		}
		if comment.ParentID != nil {
			return tx.Exec(`UPDATE comments SET replies_count = (
					SELECT COUNT(*) FROM comments
					WHERE parent_id = ? AND deleted_at IS NULL AND moderation_status = 'active'
				) WHERE id = ?`, *comment.ParentID, *comment.ParentID).Error
		}
		return nil
	}); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete comment")
		return
	}
	respond.OK(w, map[string]any{"deleted": true})
}
