package jwtutil

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ── Internal app JWT (legacy – kept for any non-browser API clients) ──────────

type Claims struct {
	jwt.RegisteredClaims
	Role    string `json:"role"`
	Subtype string `json:"subtype,omitempty"`
}

func secret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "default-jwt-secret-change-in-production"
	}
	return []byte(s)
}

func Generate(userID, role, subtype string) (string, error) {
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		Role:    role,
		Subtype: subtype,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret())
}

func Parse(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// ── Session JWT (Campus One OIDC – stored in httponly cookie) ─────────────────

// SessionClaims are stored in the nile_session httponly cookie after Campus One
// OIDC login. They carry enough data for /api/auth/me without a DB round-trip
// on every hot page, while mw.Auth still validates against the DB.
type SessionClaims struct {
	jwt.RegisteredClaims
	UserID    string `json:"uid"`
	Role      string `json:"role"`
	Subtype   string `json:"sub_type,omitempty"`
	Email     string `json:"email"`
	FullName  string `json:"name"`
	Username  string `json:"username"`
	StudentID string `json:"student_id,omitempty"`
}

func sessionSecret() []byte {
	s := os.Getenv("SESSION_SECRET")
	if s == "" {
		// Fall back to JWT_SECRET so existing deployments work without a new var.
		s = os.Getenv("JWT_SECRET")
	}
	if s == "" {
		s = "default-session-secret-change-in-production"
	}
	return []byte(s)
}

func GenerateSession(userID, role, subtype, email, fullName, username, studentID string) (string, error) {
	claims := &SessionClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		UserID:    userID,
		Role:      role,
		Subtype:   subtype,
		Email:     email,
		FullName:  fullName,
		Username:  username,
		StudentID: studentID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(sessionSecret())
}

func ParseSession(tokenString string) (*SessionClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SessionClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return sessionSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*SessionClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid session token")
	}
	return claims, nil
}
