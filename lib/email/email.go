// Package email sends transactional notifications via Resend. Every call is
// fire-and-forget from the caller's perspective: failures are logged, never
// returned as API errors, since a broken email send must not break the
// underlying action (an application, a stage change, etc).
package email

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

const resendEndpoint = "https://api.resend.com/emails"

// Send fires an email in the background. Safe to call from any handler.
func Send(to, subject, html string) {
	if to == "" {
		return
	}
	go send(to, subject, html)
}

func send(to, subject, html string) {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		log.Printf("email: RESEND_API_KEY not set, skipping send to %s (%s)", to, subject)
		return
	}
	from := os.Getenv("RESEND_FROM")
	if from == "" {
		from = "Nile Connect <notifications@nileconnect.app>"
	}

	body, _ := json.Marshal(map[string]any{
		"from":    from,
		"to":      []string{to},
		"subject": subject,
		"html":    html,
	})

	req, err := http.NewRequest(http.MethodPost, resendEndpoint, bytes.NewReader(body))
	if err != nil {
		log.Printf("email: request build failed: %v", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("email: send to %s failed: %v", to, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		log.Printf("email: resend returned status %d for %s", resp.StatusCode, to)
	}
}
