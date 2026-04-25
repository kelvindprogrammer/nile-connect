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

// Auth extracts and validates the Bearer token from the request.
func Auth(r *http.Request) (*AuthCtx, error) {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return nil, errors.New("missing or malformed token")
	}
	claims, err := jwtutil.Parse(strings.TrimPrefix(header, "Bearer "))
	if err != nil {
		return nil, err
	}
	return &AuthCtx{
		UserID:  claims.Subject,
		Role:    claims.Role,
		Subtype: claims.Subtype,
	}, nil
}
