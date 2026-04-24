package catchup

import "time"

type CreatePostRequest struct {
	Content  string `json:"content"`
	MediaUrl string `json:"media_url"`
}

type PostResponse struct {
	ID            string    `json:"id"`
	AuthorID      string    `json:"author_id"`
	AuthorName    string    `json:"author_name"`
	AuthorType    string    `json:"author_type"`
	Content       string    `json:"content"`
	MediaUrl      string    `json:"media_url,omitempty"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	CreatedAt     time.Time `json:"created_at"`
}
