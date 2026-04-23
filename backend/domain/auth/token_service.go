package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/nile-connect/backend/internal/config"
	"github.com/nile-connect/backend/internal/database"
)

// TokenService handles JWT token generation and validation
type TokenService struct {
	cfg *config.Config
}

func NewTokenService(cfg *config.Config) *TokenService {
	return &TokenService{cfg: cfg}
}

// GenerateToken creates a JWT token for a user
func (ts *TokenService) GenerateToken(user *database.User) (string, error) {
	var studentSubtype *string
	if user.StudentSubtype != nil {
		st := string(*user.StudentSubtype)
		studentSubtype = &st
	}

	var subtype string
	if studentSubtype != nil {
		subtype = *studentSubtype
	}

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // 24 hours
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		Role:    string(user.Role),
		Subtype: subtype,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(ts.cfg.JWTSecret))
}

// ParseToken validates and parses a JWT token
func (ts *TokenService) ParseToken(tokenString string) (*Claims, error) {
	return ParseToken(tokenString, ts.cfg.JWTSecret)
}