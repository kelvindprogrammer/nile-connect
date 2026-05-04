package mw

import (
	"errors"
	"net/http"
	"strings"

	"nile-connect/lib/db"
	"nile-connect/lib/jwtutil"
	"nile-connect/lib/models"
)

func CORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// HandlePreflight writes CORS headers and returns true if the request was an OPTIONS preflight.
func HandlePreflight(w http.ResponseWriter, r *http.Request) bool {
	CORS(w)
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

// Auth validates the Bearer JWT and looks up the user's current role in the
// database. Using the DB role (not the JWT role claim) means stale or
// legacy tokens with a missing/wrong role still work — the source of truth
// is always the database row, not the signed claim.
func Auth(r *http.Request) (*AuthCtx, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, errors.New("unauthorized")
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// Validate signature and extract subject (user ID)
	claims, err := jwtutil.Parse(tokenString)
	if err != nil {
		return nil, errors.New("unauthorized")
	}

	// Look up the user in the database to get the live role.
	// This is the authoritative check — the JWT role claim can be stale.
	database, dbErr := db.Get()
	if dbErr != nil {
		// If DB is unavailable, fall back to JWT claims so auth doesn't
		// block every request during a DB cold-start.
		return &AuthCtx{
			UserID:  claims.Subject,
			Role:    claims.Role,
			Subtype: claims.Subtype,
		}, nil
	}

	var user models.User
	if err := database.
		Where("id = ? AND deleted_at IS NULL", claims.Subject).
		First(&user).Error; err != nil {
		return nil, errors.New("unauthorized")
	}

	return &AuthCtx{
		UserID:  user.ID,
		Role:    user.Role,
		Subtype: user.StudentSubtype,
	}, nil
}
