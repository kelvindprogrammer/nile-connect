package handler

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"nile-connect/lib/db"
	"nile-connect/lib/jwtutil"
	"nile-connect/lib/models"
	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

// ── Campus One OIDC constants (hardcoded — no discovery request needed) ───────
// Discovery URL path differs from the standard /.well-known/openid-configuration
// so we skip oidc.NewProvider() and reference endpoints from the docs directly.

const (
	campusOneIssuer   = "https://auth.campusone.com.ng"
	campusOneAuthURL  = "https://auth.campusone.com.ng/api/auth/oauth2/authorize"
	campusOneTokenURL = "https://auth.campusone.com.ng/api/auth/oauth2/token"
	campusOneJWKSURL  = "https://auth.campusone.com.ng/api/auth/jwks"
)

// campusOneKeySet fetches and caches Campus One's public keys lazily on first
// token verification. No network call happens at init time.
var campusOneKeySet = oidc.NewRemoteKeySet(context.Background(), campusOneJWKSURL)

// oauthConfig builds a per-request oauth2.Config with the correct RedirectURL.
// Credentials are read from env vars at call time so they always reflect the
// current Vercel environment (no stale values from init).
func oauthConfig(r *http.Request) oauth2.Config {
	return oauth2.Config{
		ClientID:     os.Getenv("CAMPUS_ONE_CLIENT_ID"),
		ClientSecret: os.Getenv("CAMPUS_ONE_CLIENT_SECRET"),
		RedirectURL:  appBaseURL(r) + "/api/auth/callback",
		Endpoint: oauth2.Endpoint{
			AuthURL:  campusOneAuthURL,
			TokenURL: campusOneTokenURL,
		},
		Scopes: []string{"openid", "profile", "email", "academic", "roles", "offline_access"},
	}
}

// appBaseURL infers the application root URL from the request or APP_URL env var.
func appBaseURL(r *http.Request) string {
	if u := os.Getenv("APP_URL"); u != "" {
		return strings.TrimRight(u, "/")
	}
	scheme := "https"
	if r.Header.Get("X-Forwarded-Proto") == "" && r.TLS == nil {
		scheme = "http"
	}
	return scheme + "://" + r.Host
}

// cookieDomain extracts the domain from the application's base URL for proper cookie scoping.
// Ensures cookies set during /login are re-sent by browser from Campus One's redirect.
func cookieDomain(r *http.Request) string {
	baseURL := appBaseURL(r)
	u, err := url.Parse(baseURL)
	if err != nil {
		// Fallback to raw Host header
		host := r.Host
		if strings.Contains(host, ":") {
			host = strings.Split(host, ":")[0]
		}
		if host == "localhost" || strings.HasPrefix(host, "127.") {
			return "" // localhost cookies: no domain needed
		}
		return host
	}
	hostname := u.Hostname()
	if hostname == "localhost" || strings.HasPrefix(hostname, "127.") {
		return "" // localhost cookies: no domain needed
	}
	return hostname
}

// ── Main handler ──────────────────────────────────────────────────────────────

// Handler is the single entrypoint for all /api/auth/* routes.
// vercel.json rewrites pass the sub-path as ?path=<value>.
func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}

	if os.Getenv("CAMPUS_ONE_CLIENT_ID") == "" {
		respond.Error(w, http.StatusServiceUnavailable,
			"CAMPUS_ONE_CLIENT_ID is not set — add it to your environment variables")
		return
	}

	switch r.URL.Query().Get("path") {
	case "login":
		login(w, r)
	case "callback":
		callback(w, r)
	case "logout":
		logout(w, r)
	case "me":
		me(w, r)
	case "delete-account":
		deleteAccount(w, r)
	case "webhook":
		webhook(w, r)
	default:
		respond.Error(w, http.StatusNotFound, "not found")
	}
}

// ── login ─────────────────────────────────────────────────────────────────────

// login initiates the Campus One OIDC PKCE authorization code flow.
// The browser is redirected to Campus One's consent screen.
func login(w http.ResponseWriter, r *http.Request) {
	// Remember where to send the user after a successful login.
	next := r.URL.Query().Get("next")
	if next == "" || !strings.HasPrefix(next, "/") {
		next = ""
	}

	state := randBase64(16)
	verifier := randBase64(32)
	challenge := pkceChallenge(verifier)

	secure := isSecureContext(r)
	domain := cookieDomain(r)
	
	// DEBUG: Log domain calculation and request info
	fmt.Printf("[LOGIN] Request Host: %s, TLS: %v, X-Forwarded-Proto: %s\n", r.Host, r.TLS != nil, r.Header.Get("X-Forwarded-Proto"))
	fmt.Printf("[LOGIN] APP_URL env: %s\n", os.Getenv("APP_URL"))
	fmt.Printf("[LOGIN] appBaseURL: %s\n", appBaseURL(r))
	fmt.Printf("[LOGIN] Calculated domain: '%s', secure: %v\n", domain, secure)

	// Set temporary PKCE cookies that will be validated in /callback
	// CRITICAL: These cookies MUST be re-sent by the browser when Campus One redirects back
	setTempCookie(w, "c1_state", state, 600, secure, domain)
	setTempCookie(w, "c1_verifier", verifier, 600, secure, domain)
	if next != "" {
		setTempCookie(w, "c1_next", next, 600, secure, domain)
	}

	cfg := oauthConfig(r)
	authURL := cfg.AuthCodeURL(
		state,
		oauth2.SetAuthURLParam("code_challenge", challenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// ── callback ──────────────────────────────────────────────────────────────────

// campusOneClaims mirrors the id_token payload from Campus One.
type campusOneClaims struct {
	Sub          string   `json:"sub"`
	Email        string   `json:"email"`
	Name         string   `json:"name"`
	Role         string   `json:"role"`
	Roles        []string `json:"roles"`
	CustomRoles  []string `json:"custom_roles"`
	StudentID    string   `json:"student_id"`
	StudyLevel   string   `json:"study_level"`
	Level        int      `json:"level"`
	FacultyID    string   `json:"faculty_id"`
	DepartmentID string   `json:"department_id"`
}

// callback handles the redirect from Campus One after the user consents.
// It exchanges the authorisation code for tokens, verifies the id_token,
// upserts the local user row, and sets a signed session cookie.
func callback(w http.ResponseWriter, r *http.Request) {
	// DEBUG: Log request info and all received cookies
	fmt.Printf("[CALLBACK] Request Host: %s, Referer: %s\n", r.Host, r.Referer())
	fmt.Printf("[CALLBACK] All cookies received: ")
	for _, c := range r.Cookies() {
		fmt.Printf("%s ", c.Name)
	}
	fmt.Printf("\n")
	
	// ── 1. Retrieve and validate PKCE / state cookies ─────────────────────────
	stateCookie, err := r.Cookie("c1_state")
	if err != nil || stateCookie.Value == "" {
		fmt.Printf("[CALLBACK] ERROR: state cookie not found (err: %v)\n", err)
		respond.Error(w, http.StatusBadRequest, "missing state cookie — restart sign-in")
		return
	}
	fmt.Printf("[CALLBACK] state cookie found: %s\n", stateCookie.Value[:8])
	verifierCookie, err := r.Cookie("c1_verifier")
	if err != nil || verifierCookie.Value == "" {
		fmt.Printf("[CALLBACK] ERROR: verifier cookie not found\n")
		respond.Error(w, http.StatusBadRequest, "missing verifier cookie — restart sign-in")
		return
	}
	fmt.Printf("[CALLBACK] verifier cookie found\n")
	if r.URL.Query().Get("state") != stateCookie.Value {
		respond.Error(w, http.StatusBadRequest, "state mismatch — possible CSRF")
		return
	}
	// Handle authorisation errors returned by Campus One (e.g. user cancelled).
	if errParam := r.URL.Query().Get("error"); errParam != "" {
		desc := r.URL.Query().Get("error_description")
		http.Redirect(w, r, "/login?error="+errParam+"&desc="+desc, http.StatusFound)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		respond.Error(w, http.StatusBadRequest, "no authorization code in callback")
		return
	}

	// ── 2. Exchange code for tokens ───────────────────────────────────────────
	ctx := r.Context()
	cfg := oauthConfig(r)
	token, err := cfg.Exchange(ctx, code,
		oauth2.SetAuthURLParam("code_verifier", verifierCookie.Value),
	)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "token exchange failed: "+err.Error())
		return
	}

	// ── 3. Verify id_token signature against Campus One JWKS ─────────────────
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		respond.Error(w, http.StatusInternalServerError, "no id_token in token response")
		return
	}
	verifier := oidc.NewVerifier(campusOneIssuer, campusOneKeySet, &oidc.Config{
		ClientID:             os.Getenv("CAMPUS_ONE_CLIENT_ID"),
		SupportedSigningAlgs: []string{"EdDSA", "RS256"},
	})
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "id_token verification failed: "+err.Error())
		return
	}

	// ── 4. Extract claims ─────────────────────────────────────────────────────
	var claims campusOneClaims
	if err := idToken.Claims(&claims); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not decode id_token claims")
		return
	}
	var rawClaims map[string]any
	if err := idToken.Claims(&rawClaims); err == nil {
		if len(claims.Roles) == 0 {
			claims.Roles = normalizeRolesClaim(rawClaims["roles"])
		}
		fmt.Printf("[CALLBACK] raw claim role=%v (%T), raw claim roles=%v (%T)\n",
			rawClaims["role"], rawClaims["role"], rawClaims["roles"], rawClaims["roles"])
	}
	if claims.Sub == "" {
		respond.Error(w, http.StatusInternalServerError, "id_token missing sub claim")
		return
	}
	fmt.Printf("[CALLBACK] Claim role: '%s', normalized roles: %v, custom_roles: %v\n", claims.Role, claims.Roles, claims.CustomRoles)

	// ── 5. Upsert local user ──────────────────────────────────────────────────
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}
	user, err := upsertUser(database, &claims)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not save user: "+err.Error())
		return
	}

	// ── 6. Issue session cookie ───────────────────────────────────────────────
	if err := setSessionCookie(w, r, user); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not create session")
		return
	}

	// Clear PKCE cookies.
	secure := isSecureContext(r)
	domain := cookieDomain(r)
	clearCookie(w, "c1_state", secure, domain)
	clearCookie(w, "c1_verifier", secure, domain)

	// ── 7. Redirect to dashboard ──────────────────────────────────────────────
	next := ""
	if c, err := r.Cookie("c1_next"); err == nil {
		next = c.Value
		clearCookie(w, "c1_next", secure, domain)
	}
	if next == "" {
		next = roleDashboard(user.Role)
	}
	http.Redirect(w, r, appBaseURL(r)+next, http.StatusFound)
}

// ── logout ────────────────────────────────────────────────────────────────────

func logout(w http.ResponseWriter, r *http.Request) {
	secure := isSecureContext(r)
	domain := cookieDomain(r)
	clearCookie(w, "nile_session", secure, domain)

	// Accept both GET (link click) and POST (programmatic call).
	if r.Header.Get("Accept") == "application/json" ||
		r.Header.Get("Content-Type") == "application/json" {
		respond.OK(w, map[string]string{"message": "signed out"})
		return
	}
	http.Redirect(w, r, "/login", http.StatusFound)
}

// ── me ────────────────────────────────────────────────────────────────────────

func me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cookie, err := r.Cookie("nile_session")
	if err != nil || cookie.Value == "" {
		respond.Error(w, http.StatusUnauthorized, "not signed in")
		return
	}
	sessionClaims, err := jwtutil.ParseSession(cookie.Value)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "invalid session")
		return
	}

	// Refresh from DB to pick up any role / profile changes since last login.
	database, dbErr := db.Get()
	if dbErr != nil {
		// DB unavailable — serve cached session claims rather than blocking.
		respond.OK(w, sessionClaimsToResponse(sessionClaims))
		return
	}
	var user models.User
	if err := database.Where("id = ? AND deleted_at IS NULL", sessionClaims.UserID).
		First(&user).Error; err != nil {
		respond.Error(w, http.StatusUnauthorized, "user not found")
		return
	}
	respond.OK(w, userToResponse(&user))
}

// ── delete account ────────────────────────────────────────────────────────────

func deleteAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	auth, err := mw.Auth(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}
	if err := database.Model(&models.User{}).
		Where("id = ?", auth.UserID).
		Update("deleted_at", time.Now()).Error; err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete account")
		return
	}
	// Clear the session so the browser is immediately signed out.
	clearCookie(w, "nile_session", isSecureContext(r), cookieDomain(r))
	respond.OK(w, map[string]string{"message": "account deleted"})
}

// ── webhook ───────────────────────────────────────────────────────────────────

// webhook receives Campus One lifecycle events (user.role_changed, user.deleted, etc.).
// Signature: HMAC-SHA256 of the raw body, keyed with CAMPUS_ONE_WEBHOOK_SECRET.
func webhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// Read raw body first — must happen before any parsing.
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "could not read body")
		return
	}

	// Verify HMAC-SHA256 signature.
	secret := os.Getenv("CAMPUS_ONE_WEBHOOK_SECRET")
	if secret == "" {
		respond.Error(w, http.StatusInternalServerError, "webhook secret not configured")
		return
	}
	sig := r.Header.Get("X-Campus-One-Signature")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	sigBytes := []byte(sig)
	expBytes := []byte(expected)
	if len(sigBytes) != len(expBytes) || !hmac.Equal(sigBytes, expBytes) {
		respond.Error(w, http.StatusUnauthorized, "invalid webhook signature")
		return
	}

	// Parse event envelope.
	var event struct {
		Event string                 `json:"event"`
		Data  map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid event payload")
		return
	}

	database, err := db.Get()
	if err != nil {
		// Log and return 200 so Campus One doesn't retry a permanent error.
		fmt.Fprintf(os.Stderr, "campus-one webhook: DB unavailable for event %s\n", event.Event)
		respond.OK(w, map[string]string{"status": "queued"})
		return
	}

	switch event.Event {
	case "user.role_changed":
		if userID, ok := event.Data["user_id"].(string); ok {
			newRole, _ := event.Data["new_role"].(string)
			appRole, appSubtype := mapCampusOneRole(newRole)
			database.Model(&models.User{}).
				Where("campus_one_sub = ?", userID).
				Updates(map[string]interface{}{
					"role":            appRole,
					"student_subtype": appSubtype,
				})
		}
	case "user.updated":
		if userID, ok := event.Data["user_id"].(string); ok {
			updates := map[string]interface{}{}
			if email, ok := event.Data["email"].(string); ok && email != "" {
				updates["email"] = email
			}
			if name, ok := event.Data["name"].(string); ok && name != "" {
				updates["full_name"] = name
			}
			if len(updates) > 0 {
				database.Model(&models.User{}).
					Where("campus_one_sub = ?", userID).
					Updates(updates)
			}
		}
	case "user.deleted":
		if userID, ok := event.Data["user_id"].(string); ok {
			database.Model(&models.User{}).
				Where("campus_one_sub = ?", userID).
				Update("deleted_at", time.Now())
		}
	}

	respond.OK(w, map[string]string{"status": "ok"})
}

// ── helpers ───────────────────────────────────────────────────────────────────

var nonAlphanumRe = regexp.MustCompile(`[^a-z0-9_]`)

// upsertUser finds an existing user by Campus One sub (or by email for users
// who pre-dated the OIDC migration) and creates one if neither exists.
func upsertUser(database *gorm.DB, c *campusOneClaims) (*models.User, error) {
	role, subtype := mapCampusOneRoleFromClaims(c)

	updates := map[string]interface{}{
		"campus_one_sub":  c.Sub,
		"full_name":       c.Name,
		"email":           c.Email,
		"role":            role,
		"student_subtype": subtype,
		"is_verified":     true,
		"student_id":      c.StudentID,
		"study_level":     c.StudyLevel,
		"level":           c.Level,
		"faculty_id":      c.FacultyID,
		"department_id":   c.DepartmentID,
	}

	// 1. Look up by Campus One sub (stable across logins).
	var user models.User
	err := database.Where("campus_one_sub = ? AND deleted_at IS NULL", c.Sub).First(&user).Error
	if err == nil {
		database.Model(&user).Updates(updates)
		return &user, nil
	}

	// 2. Fall back to email (covers users who registered before OIDC migration).
	err = database.Where("email = ? AND deleted_at IS NULL", c.Email).First(&user).Error
	if err == nil {
		database.Model(&user).Updates(updates)
		return &user, nil
	}

	// 3. New user — create a unique username derived from the email prefix.
	username := generateUsername(database, c)
	user = models.User{
		CampusOneSub:   c.Sub,
		FullName:       c.Name,
		Username:       username,
		Email:          c.Email,
		Role:           role,
		StudentSubtype: subtype,
		IsVerified:     true,
		StudentID:      c.StudentID,
		StudyLevel:     c.StudyLevel,
		Level:          c.Level,
		FacultyID:      c.FacultyID,
		DepartmentID:   c.DepartmentID,
	}
	if err := database.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func generateUsername(database *gorm.DB, c *campusOneClaims) string {
	base := strings.ToLower(strings.SplitN(c.Email, "@", 2)[0])
	base = nonAlphanumRe.ReplaceAllString(base, "_")
	if base == "" {
		base = "user"
	}

	candidate := base
	var count int64
	database.Model(&models.User{}).Where("username = ?", candidate).Count(&count)
	if count == 0 {
		return candidate
	}

	// Try appending the student ID digits.
	if c.StudentID != "" {
		suffix := strings.ReplaceAll(c.StudentID, "/", "")
		candidate = base + "_" + suffix
		database.Model(&models.User{}).Where("username = ?", candidate).Count(&count)
		if count == 0 {
			return candidate
		}
	}

	// Last resort: random 6-char hex suffix.
	b := make([]byte, 4)
	rand.Read(b)
	return base + "_" + hex.EncodeToString(b)[:6]
}

// mapCampusOneRole converts a Campus One role string to the Nile Connect
// (role, studentSubtype) pair stored in the database.
func mapCampusOneRoleFromClaims(c *campusOneClaims) (role, subtype string) {
	// PRIORITY 1: Check custom_roles for app-specific assignments (e.g., "employer_partners").
	// Custom roles are the strongest signal and override global roles.
	for _, cr := range c.CustomRoles {
		if isCampusOneEmployerRole(cr) {
			fmt.Printf("[CALLBACK] Matched employer role in custom_roles: %s\n", cr)
			return "employer", ""
		}
	}
	for _, cr := range c.CustomRoles {
		if isCampusOneStaffRole(cr) {
			fmt.Printf("[CALLBACK] Matched staff role in custom_roles: %s\n", cr)
			return "staff", ""
		}
	}

	// PRIORITY 2: Prefer explicit role membership from Campus One's `roles[]` claim.
	// This avoids cases where `role` is a default value like "student"
	// while `roles` includes a valid employer or staff membership.
	for _, r := range c.Roles {
		if isCampusOneEmployerRole(r) {
			fmt.Printf("[CALLBACK] Matched employer role in roles[]: %s\n", r)
			return "employer", ""
		}
	}
	for _, r := range c.Roles {
		if isCampusOneStaffRole(r) {
			fmt.Printf("[CALLBACK] Matched staff role in roles[]: %s\n", r)
			return "staff", ""
		}
	}
	for _, r := range c.Roles {
		if strings.EqualFold(r, "alumni") || strings.EqualFold(r, "mentor") {
			fmt.Printf("[CALLBACK] Matched alumni/mentor in roles[]: %s\n", r)
			return "student", "alumni"
		}
	}

	// PRIORITY 3: Fall back to primary role claim.
	if c.Role != "" {
		return mapCampusOneRole(c.Role)
	}

	return "student", "current"
}

func isCampusOneEmployerRole(role string) bool {
	r := strings.ToLower(strings.TrimSpace(role))
	switch r {
	case "employer", "founder", "consultant", "partner", "employer_partner", "company_partner", "campus_partner", "external", "external_partner", "external_employer", "employer_external":
		return true
	}
	return strings.Contains(r, "employer") || strings.Contains(r, "partner") || strings.Contains(r, "external")
}

func isCampusOneStaffRole(role string) bool {
	r := strings.ToLower(strings.TrimSpace(role))
	switch r {
	case "staff", "admin", "auditor", "career_service", "career_services":
		return true
	}
	return strings.Contains(r, "staff") || strings.Contains(r, "admin") || strings.Contains(r, "auditor")
}

func mapCampusOneRole(campusOneRole string) (role, subtype string) {
	clean := strings.ToLower(strings.TrimSpace(campusOneRole))
	switch clean {
	case "student":
		return "student", "current"
	case "alumni", "mentor":
		return "student", "alumni"
	case "staff", "admin", "auditor":
		return "staff", ""
	case "employer", "founder", "consultant", "partner", "employer_partner", "company_partner", "campus_partner", "external", "external_partner", "external_employer", "employer_external":
		return "employer", ""
	default:
		if strings.Contains(clean, "employ") || strings.Contains(clean, "partner") || strings.Contains(clean, "external") {
			return "employer", ""
		}
		return "student", "current"
	}
}

func normalizeRolesClaim(value any) []string {
	var out []string
	switch v := value.(type) {
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
	case []string:
		out = append(out, v...)
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil
		}
		if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
			trimmed = strings.Trim(trimmed, "[]")
		}
		for _, item := range strings.Split(trimmed, ",") {
			s := strings.TrimSpace(strings.Trim(item, `"'`))
			if s != "" {
				out = append(out, s)
			}
		}
	}
	return out
}

// roleDashboard returns the frontend path for a given role.
func roleDashboard(role string) string {
	switch role {
	case "staff":
		return "/staff"
	case "employer":
		return "/employer"
	default:
		return "/student"
	}
}

// setSessionCookie writes a signed session JWT as an httponly cookie.
func setSessionCookie(w http.ResponseWriter, r *http.Request, user *models.User) error {
	sessionToken, err := jwtutil.GenerateSession(
		user.ID, user.Role, user.StudentSubtype,
		user.Email, user.FullName, user.Username, user.StudentID,
	)
	if err != nil {
		return err
	}
	domain := cookieDomain(r)
	http.SetCookie(w, &http.Cookie{
		Name:     "nile_session",
		Value:    sessionToken,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7 days
		HttpOnly: true,
		Secure:   isSecureContext(r),
		SameSite: http.SameSiteLaxMode,
		Domain:   domain,
	})
	return nil
}

// setTempCookie sets a short-lived httponly cookie used during the PKCE flow.
// CRITICAL: Must include Domain for cookies to be re-sent from Campus One's redirect.
func setTempCookie(w http.ResponseWriter, name, value string, maxAge int, secure bool, domain string) {
	fmt.Printf("[COOKIE] Setting %s with domain='%s', secure=%v, httpOnly=true\n", name, domain, secure)
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Domain:   domain, // Critical for cross-origin Campus One redirect
	})
}

// clearCookie expires a cookie by setting MaxAge to -1.
func clearCookie(w http.ResponseWriter, name string, secure bool, domain string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Domain:   domain,
	})
}

// isSecureContext returns true when the request arrived over HTTPS.
func isSecureContext(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	if r.Header.Get("X-Forwarded-Proto") == "https" {
		return true
	}
	host := r.Host
	return !strings.HasPrefix(host, "localhost") && !strings.HasPrefix(host, "127.0.0.1")
}

// randBase64 returns n random bytes encoded as base64url (no padding).
func randBase64(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// pkceChallenge computes the S256 PKCE code challenge from a verifier.
func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// userToResponse converts a DB User to the JSON shape returned by /api/auth/me.
func userToResponse(u *models.User) map[string]any {
	return map[string]any{
		"id":              u.ID,
		"name":            u.FullName,
		"username":        u.Username,
		"email":           u.Email,
		"role":            u.Role,
		"student_subtype": u.StudentSubtype,
		"student_id":      u.StudentID,
		"study_level":     u.StudyLevel,
		"level":           u.Level,
		"faculty_id":      u.FacultyID,
		"department_id":   u.DepartmentID,
		"is_verified":     u.IsVerified,
	}
}

// sessionClaimsToResponse converts cached session JWT claims to the /me shape
// when the database is temporarily unavailable.
func sessionClaimsToResponse(c *jwtutil.SessionClaims) map[string]any {
	return map[string]any{
		"id":         c.UserID,
		"name":       c.FullName,
		"username":   c.Username,
		"email":      c.Email,
		"role":       c.Role,
		"student_subtype": c.Subtype,
		"student_id": c.StudentID,
		"is_verified": true,
	}
}
