package mw

import (
	"errors"
	"net/http"
	"strings"

	"nile-connect/lib/jwtutil"
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

// Auth validates the JWT Bearer token from the Authorization header.
func Auth(r *http.Request) (*AuthCtx, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, errors.New("unauthorized")
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := jwtutil.Parse(tokenString)
	if err != nil {
		return nil, errors.New("unauthorized")
	}
	return &AuthCtx{
		UserID:  claims.Subject,
		Role:    claims.Role,
		Subtype: claims.Subtype,
	}, nil
}
