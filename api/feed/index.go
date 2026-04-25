package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

type postResponse struct {
	ID            string    `json:"id"`
	AuthorID      string    `json:"author_id"`
	AuthorType    string    `json:"author_type"`
	Content       string    `json:"content"`
	MediaUrl      string    `json:"media_url,omitempty"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	CreatedAt     time.Time `json:"created_at"`
}

type createPostRequest struct {
	Content  string `json:"content"`
	MediaUrl string `json:"media_url"`
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

	switch r.Method {
	case http.MethodGet:
		var posts []models.Post
		if err := database.Where("deleted_at IS NULL").Order("created_at desc").Limit(50).Find(&posts).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch feed")
			return
		}
		result := make([]postResponse, 0, len(posts))
		for _, p := range posts {
			result = append(result, toPostResponse(&p))
		}
		respond.OK(w, map[string]any{"posts": result})

	case http.MethodPost:
		auth, err := mw.Auth(r)
		if err != nil {
			respond.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}
		var req createPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respond.Error(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Content == "" {
			respond.Error(w, http.StatusBadRequest, "content is required")
			return
		}
		post := models.Post{
			AuthorID:   auth.UserID,
			AuthorType: auth.Role,
			Content:    req.Content,
			MediaUrl:   req.MediaUrl,
		}
		if err := database.Create(&post).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create post")
			return
		}
		respond.Created(w, toPostResponse(&post))

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func toPostResponse(p *models.Post) postResponse {
	return postResponse{
		ID:            p.ID,
		AuthorID:      p.AuthorID,
		AuthorType:    p.AuthorType,
		Content:       p.Content,
		MediaUrl:      p.MediaUrl,
		LikesCount:    p.LikesCount,
		CommentsCount: p.CommentsCount,
		CreatedAt:     p.CreatedAt,
	}
}
