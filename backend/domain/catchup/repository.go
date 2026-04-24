package catchup

import (
	"github.com/nile-connect/backend/internal/database"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListPosts() ([]PostResponse, error) {
	var posts []database.Post
	if err := r.db.Where("deleted_at IS NULL").Order("created_at DESC").Limit(50).Find(&posts).Error; err != nil {
		return nil, err
	}
	result := make([]PostResponse, 0, len(posts))
	for _, p := range posts {
		resp := postToResponse(p)
		var author database.User
		if r.db.Select("full_name").Where("id = ?", p.AuthorID).First(&author).Error == nil {
			resp.AuthorName = author.FullName
		}
		result = append(result, resp)
	}
	return result, nil
}

func (r *Repository) CreatePost(post *database.Post) (*PostResponse, error) {
	if err := r.db.Create(post).Error; err != nil {
		return nil, err
	}
	resp := postToResponse(*post)
	var author database.User
	if r.db.Select("full_name").Where("id = ?", post.AuthorID).First(&author).Error == nil {
		resp.AuthorName = author.FullName
	}
	return &resp, nil
}

func (r *Repository) LikePost(postID, userID string) error {
	like := &database.PostLike{PostID: postID, UserID: userID}
	if err := r.db.Create(like).Error; err != nil {
		return err
	}
	return r.db.Model(&database.Post{}).Where("id = ?", postID).
		UpdateColumn("likes_count", gorm.Expr("likes_count + 1")).Error
}

func (r *Repository) DeletePost(postID, authorID string) error {
	return r.db.Where("id = ? AND author_id = ?", postID, authorID).Delete(&database.Post{}).Error
}

func postToResponse(p database.Post) PostResponse {
	return PostResponse{
		ID:            p.ID,
		AuthorID:      p.AuthorID,
		AuthorType:    string(p.AuthorType),
		Content:       p.Content,
		MediaUrl:      p.MediaUrl,
		LikesCount:    p.LikesCount,
		CommentsCount: p.CommentsCount,
		CreatedAt:     p.CreatedAt,
	}
}
