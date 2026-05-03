package mw

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
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

type sessionResponse struct {
	User *struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
		Role  string `json:"role"`
	} `json:"user"`
}

// Auth validates the Campus One session by proxying the cookie.
func Auth(r *http.Request) (*AuthCtx, error) {
	// CSRF Protection for state-changing requests
	if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodDelete || r.Method == http.MethodPatch {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = r.Header.Get("Referer")
		}
		
		// If neither Origin nor Referer is present, or if it doesn't match our allowed domains, reject
		if origin == "" || (!strings.Contains(origin, ".builtbysalih.com") && !strings.Contains(origin, "localhost")) {
			return nil, errors.New("forbidden: csrf check failed")
		}
	}

	req, err := http.NewRequest(http.MethodGet, "https://api.builtbysalih.com/api/session", nil)
	if err != nil {
		return nil, errors.New("internal server error")
	}

	// Forward the Cookie header verbatim
	req.Header.Set("Cookie", r.Header.Get("Cookie"))

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, errors.New("unauthorized")
	}
	defer resp.Body.Close()

	var session sessionResponse
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil || session.User == nil {
		return nil, errors.New("unauthorized")
	}

	return &AuthCtx{
		UserID:  session.User.ID,
		Role:    session.User.Role,
		Subtype: "current", // Default subtype, can be updated if profile fetch is needed
	}, nil
}

