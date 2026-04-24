package catchup

import (
	"errors"

	"github.com/nile-connect/backend/internal/database"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetFeed() ([]PostResponse, error) {
	return s.repo.ListPosts()
}

func (s *Service) CreatePost(authorID, authorType, content, mediaUrl string) (*PostResponse, error) {
	if content == "" {
		return nil, errors.New("content is required")
	}
	post := &database.Post{
		AuthorID:   authorID,
		AuthorType: database.Role(authorType),
		Content:    content,
		MediaUrl:   mediaUrl,
	}
	return s.repo.CreatePost(post)
}

func (s *Service) LikePost(postID, userID string) error {
	return s.repo.LikePost(postID, userID)
}

func (s *Service) DeletePost(postID, authorID string) error {
	return s.repo.DeletePost(postID, authorID)
}
