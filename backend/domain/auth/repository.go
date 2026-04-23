package auth

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