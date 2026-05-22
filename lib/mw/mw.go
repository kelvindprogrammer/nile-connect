package mw

import (
	"errors"
	"net/http"
	"strings"

	"nile-connect/lib/db"
	"nile-connect/lib/jwtutil"
	"nile-connect/lib/models"
)

// CORS sets Access-Control-Allow-* headers.
// We echo the request Origin (rather than "*") so that session cookies are
// accepted by the browser when credentials:include is set on fetch requests.
func CORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Vary", "Origin")
}

// HandlePreflight writes CORS headers and returns true if this was an OPTIONS preflight.
func HandlePreflight(w http.ResponseWriter, r *http.Request) bool {
	CORS(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

type AuthCtx struct {
	UserID  string
	Role    string
	Subtype string
}

// Auth resolves the caller's identity.
//
// Priority order:
//  1. nile_session httponly cookie (set by Campus One OIDC callback)
//  2. Authorization: Bearer <token> header (legacy / API-client fallback)
//
// After extracting claims from either source the user row is validated in the
// database so that role changes or soft-deletes take effect immediately.
func Auth(r *http.Request) (*AuthCtx, error) {
	var userID, role, subtype string

	// 1. Session cookie (Campus One OIDC)
	if cookie, err := r.Cookie("nile_session"); err == nil && cookie.Value != "" {
		if claims, err := jwtutil.ParseSession(cookie.Value); err == nil {
			userID = claims.UserID
			role = claims.Role
			subtype = claims.Subtype
		}
	}

	// 2. Bearer token fallback
	if userID == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			if claims, err := jwtutil.Parse(tokenStr); err == nil {
				userID = claims.Subject
				role = claims.Role
				subtype = claims.Subtype
			}
		}
	}

	if userID == "" {
		return nil, errors.New("unauthorized")
	}

	// Validate against the database so that role changes / deletes take effect.
	database, dbErr := db.Get()
	if dbErr != nil {
		// DB cold-start tolerance: trust the JWT claims temporarily.
		return &AuthCtx{UserID: userID, Role: role, Subtype: subtype}, nil
	}

	var user models.User
	if err := database.
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		return nil, errors.New("unauthorized")
	}

	return &AuthCtx{
		UserID:  user.ID,
		Role:    user.Role,
		Subtype: user.StudentSubtype,
	}, nil
}
