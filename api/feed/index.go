package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gorm.io/gorm"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/notify"
	"nile-connect/lib/respond"
)

type postResponse struct {
	ID            string    `json:"id"`
	AuthorID      string    `json:"author_id"`
	AuthorType    string    `json:"author_type"`
	AuthorName    string    `json:"author_name,omitempty"`
	Content       string    `json:"content"`
	MediaUrl      string    `json:"media_url,omitempty"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	Liked         bool      `json:"liked"`
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
	}

	switch r.Method {
	case http.MethodGet:
		var posts []models.Post
		if err := database.Where("deleted_at IS NULL").Order("created_at desc").Limit(50).Find(&posts).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not fetch feed")
			return
		}

		authorNames := map[string]string{}
		likedSet := map[string]bool{}
		if len(posts) > 0 {
			authorIDs := make([]string, 0, len(posts))
			postIDs := make([]string, 0, len(posts))
			for _, p := range posts {
				authorIDs = append(authorIDs, p.AuthorID)
				postIDs = append(postIDs, p.ID)
			}

			var authors []models.User
			database.Where("id IN ?", authorIDs).Find(&authors)
			for _, a := range authors {
				authorNames[a.ID] = a.FullName
			}

			if auth, err := mw.Auth(r); err == nil {
				var likes []models.PostLike
				database.Where("user_id = ? AND post_id IN ? AND deleted_at IS NULL", auth.UserID, postIDs).Find(&likes)
				for _, l := range likes {
					likedSet[l.PostID] = true
				}
			}
		}

		result := make([]postResponse, 0, len(posts))
		for _, p := range posts {
			pr := toPostResponse(&p)
			pr.AuthorName = authorNames[p.AuthorID]
			pr.Liked = likedSet[p.ID]
			result = append(result, pr)
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
		pr := toPostResponse(&post)
		var author models.User
		if database.Where("id = ?", auth.UserID).First(&author).Error == nil {
			pr.AuthorName = author.FullName
		}
		respond.Created(w, pr)

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

// POST /api/feed?path=like&id=<postID> — toggle a like on a post.
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

	var post models.Post
	if err := database.Where("id = ? AND deleted_at IS NULL", postID).First(&post).Error; err != nil {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}

	var existing models.PostLike
	liked := false
	err = database.Where("post_id = ? AND user_id = ? AND deleted_at IS NULL", postID, auth.UserID).First(&existing).Error
	if err == nil {
		// already liked — unlike
		database.Delete(&existing)
		database.Model(&models.Post{}).
			Where("id = ? AND likes_count > 0", postID).
			UpdateColumn("likes_count", gorm.Expr("likes_count - 1"))
	} else {
		database.Create(&models.PostLike{PostID: postID, UserID: auth.UserID})
		database.Model(&models.Post{}).
			Where("id = ?", postID).
			UpdateColumn("likes_count", gorm.Expr("likes_count + 1"))
		liked = true

		var actor models.User
		if database.Where("id = ?", auth.UserID).First(&actor).Error == nil {
			notify.Create(database, post.AuthorID, auth.UserID, "like",
				"New like on your post",
				fmt.Sprintf("%s liked your post", actor.FullName),
				"/feed")
		}
	}

	var likesCount int
	database.Model(&models.Post{}).Where("id = ?", postID).Select("likes_count").Scan(&likesCount)

	respond.OK(w, map[string]any{"liked": liked, "likes_count": likesCount})
}

// DELETE /api/feed?path=post&id=<postID> — delete a post (author or career-services staff only).
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
	if post.AuthorID != auth.UserID && auth.Role != "staff" {
		respond.Error(w, http.StatusNotFound, "post not found")
		return
	}

	if err := database.Delete(&post).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete post")
		return
	}
	respond.OK(w, map[string]any{"deleted": true})
}

type commentResponse struct {
	ID         string    `json:"id"`
	PostID     string    `json:"post_id"`
	AuthorID   string    `json:"author_id"`
	AuthorType string    `json:"author_type"`
	AuthorName string    `json:"author_name"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

// GET /api/feed?path=comments&id=<postID> — list comments for a post.
// POST /api/feed?path=comments&id=<postID> — add a comment to a post.
func comments(w http.ResponseWriter, r *http.Request, database *gorm.DB) {
	postID := r.URL.Query().Get("id")
	if postID == "" {
		respond.Error(w, http.StatusBadRequest, "id is required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var result []commentResponse
		database.Raw(`
			SELECT c.id, c.post_id, c.author_id, c.author_type, c.content, c.created_at, u.full_name AS author_name
			FROM comments c
			JOIN users u ON u.id = c.author_id
			WHERE c.post_id = ? AND c.deleted_at IS NULL
			ORDER BY c.created_at ASC
		`, postID).Scan(&result)
		if result == nil {
			result = []commentResponse{}
		}
		respond.OK(w, map[string]any{"comments": result})

	case http.MethodPost:
		auth, err := mw.Auth(r)
		if err != nil {
			respond.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}
		var req struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
			respond.Error(w, http.StatusBadRequest, "content is required")
			return
		}

		var post models.Post
		if err := database.Where("id = ? AND deleted_at IS NULL", postID).First(&post).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "post not found")
			return
		}

		comment := models.Comment{
			PostID:     postID,
			AuthorID:   auth.UserID,
			AuthorType: auth.Role,
			Content:    req.Content,
		}
		if err := database.Create(&comment).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not create comment")
			return
		}
		database.Model(&models.Post{}).Where("id = ?", postID).
			UpdateColumn("comments_count", gorm.Expr("comments_count + 1"))

		var author models.User
		authorName := "Someone"
		if database.Where("id = ?", auth.UserID).First(&author).Error == nil {
			authorName = author.FullName
			notify.Create(database, post.AuthorID, auth.UserID, "comment",
				"New comment on your post",
				fmt.Sprintf("%s commented: %s", authorName, notify.Truncate(req.Content, 80)),
				"/feed")
		}

		respond.Created(w, commentResponse{
			ID:         comment.ID,
			PostID:     comment.PostID,
			AuthorID:   comment.AuthorID,
			AuthorType: comment.AuthorType,
			AuthorName: authorName,
			Content:    comment.Content,
			CreatedAt:  comment.CreatedAt,
		})

	case http.MethodDelete:
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
		if err := database.Where("id = ? AND post_id = ? AND deleted_at IS NULL", commentID, postID).First(&comment).Error; err != nil {
			respond.Error(w, http.StatusNotFound, "comment not found")
			return
		}
		if comment.AuthorID != auth.UserID && auth.Role != "staff" {
			respond.Error(w, http.StatusNotFound, "comment not found")
			return
		}

		if err := database.Delete(&comment).Error; err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not delete comment")
			return
		}
		database.Model(&models.Post{}).Where("id = ? AND comments_count > 0", postID).
			UpdateColumn("comments_count", gorm.Expr("comments_count - 1"))
		respond.OK(w, map[string]any{"deleted": true})

	default:
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
