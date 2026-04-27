package auth

import (
	"errors"
	"time"

	"github.com/nile-connect/backend/internal/database"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindUserByEmail(email string) (*database.User, error) {
	var user database.User
	result := r.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *Repository) FindUserByUsername(username string) (*database.User, error) {
	var user database.User
	result := r.db.Where("username = ?", username).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *Repository) FindUserByID(id string) (*database.User, error) {
	var user database.User
	result := r.db.Where("id = ?", id).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *Repository) CreateUser(user *database.User) error {
	return r.db.Create(user).Error
}

func (r *Repository) CreateEmployerProfile(profile *database.EmployerProfile) error {
	return r.db.Create(profile).Error
}

func (r *Repository) UpdateUser(user *database.User) error {
	return r.db.Save(user).Error
}

func (r *Repository) UserExists(email, username string) (bool, error) {
	var count int64
	result := r.db.Model(&database.User{}).
		Where("email = ? OR username = ?", email, username).
		Count(&count)
	return count > 0, result.Error
}

func (r *Repository) SaveResetToken(userID, token string) error {
	reset := &database.PasswordReset{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	// Invalidate previous tokens for this user
	r.db.Where("user_id = ? AND used = false", userID).
		Updates(map[string]interface{}{"used": true})
	return r.db.Create(reset).Error
}

func (r *Repository) FindResetToken(token string) (string, error) {
	var reset database.PasswordReset
	err := r.db.Where("token = ? AND used = false AND expires_at > NOW()", token).First(&reset).Error
	if err != nil {
		return "", errors.New("invalid or expired token")
	}
	return reset.UserID, nil
}

func (r *Repository) MarkResetTokenUsed(token string) error {
	return r.db.Model(&database.PasswordReset{}).
		Where("token = ?", token).
		Update("used", true).Error
}

func (r *Repository) UpdatePassword(userID, hash string) error {
	return r.db.Model(&database.User{}).
		Where("id = ?", userID).
		Update("password_hash", hash).Error
}