// Package webpush delivers browser push notifications.
//
// This is a from-scratch implementation of the two specs a push actually
// requires, because the project has no push library and adding one for this
// was not worth a new dependency surface:
//
//	RFC 8291 — Message Encryption for Web Push (aes128gcm)
//	RFC 8292 — VAPID: voluntary application server identification
//
// Both are needed together. RFC 8291 encrypts the payload so the push service
// (Google, Mozilla, Apple) relays it without being able to read it; RFC 8292
// signs the request so the push service knows which application server sent it.
//
// Everything degrades safely: with no VAPID keys configured, Send is a no-op
// that reports "not configured" rather than erroring, exactly like lib/email
// does without a Resend key. Push is an enhancement, never a dependency.
package webpush

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var (
	ErrNotConfigured = errors.New("push notifications are not configured")
	// ErrGone means the subscription is dead and should be deleted. The push
	// service returns 404/410 for an endpoint the browser has discarded, and
	// keeping it would mean retrying a dead device forever.
	ErrGone = errors.New("that push subscription is no longer valid")
)

// Subscription is the browser-supplied endpoint and keys.
type Subscription struct {
	Endpoint string
	P256dh   string // the client's public key, base64url
	Auth     string // the client's auth secret, base64url
}

// Payload is what the service worker receives.
type Payload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon,omitempty"`
	Badge string `json:"badge,omitempty"`
	Tag   string `json:"tag,omitempty"`
	URL   string `json:"url,omitempty"`
	// Renotify replaces an existing notification with the same tag instead of
	// stacking another one — the push-side equivalent of notification grouping.
	Renotify bool `json:"renotify,omitempty"`
}

// b64 is the unpadded base64url encoding every Web Push field uses.
var b64 = base64.RawURLEncoding

// Configured reports whether VAPID keys are present.
func Configured() bool {
	return os.Getenv("VAPID_PUBLIC_KEY") != "" && os.Getenv("VAPID_PRIVATE_KEY") != ""
}

// Send delivers one notification.
//
// Returns ErrGone when the subscription should be deleted, ErrNotConfigured
// when push is not set up, and a wrapped error for transient failures.
func Send(sub Subscription, payload Payload, ttlSeconds int) error {
	if !Configured() {
		return ErrNotConfigured
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	encrypted, err := encrypt(sub, body)
	if err != nil {
		return fmt.Errorf("encrypt: %w", err)
	}
	authHeader, err := vapidHeader(sub.Endpoint)
	if err != nil {
		return fmt.Errorf("vapid: %w", err)
	}

	if ttlSeconds <= 0 {
		ttlSeconds = 86400 // a day; the service drops it after that
	}

	req, err := http.NewRequest(http.MethodPost, sub.Endpoint, bytes.NewReader(encrypted))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "aes128gcm")
	req.Header.Set("TTL", fmt.Sprintf("%d", ttlSeconds))
	req.Header.Set("Authorization", authHeader)
	// Urgency low-to-normal: a social notification should not wake a sleeping
	// phone's radio the way a call would.
	req.Header.Set("Urgency", "normal")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	switch {
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		return ErrGone
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		return nil
	default:
		return fmt.Errorf("push service returned %d", resp.StatusCode)
	}
}

// ── RFC 8291: message encryption ──────────────────────────────────────────────

// encrypt produces an aes128gcm body for the subscription.
//
// The steps, in the order the RFC defines them:
//  1. generate an ephemeral P-256 keypair
//  2. ECDH against the client's public key -> shared secret
//  3. HKDF(shared, auth_secret, "WebPush: info" || ua_pub || as_pub) -> IKM
//  4. HKDF(IKM, salt, "Content-Encoding: aes128gcm") -> CEK
//     HKDF(IKM, salt, "Content-Encoding: nonce")     -> nonce
//  5. AES-128-GCM the padded plaintext
//  6. prepend the header: salt | rs | idlen | as_pub
func encrypt(sub Subscription, plaintext []byte) ([]byte, error) {
	uaPublicBytes, err := b64.DecodeString(strings.TrimRight(sub.P256dh, "="))
	if err != nil {
		return nil, fmt.Errorf("bad p256dh: %w", err)
	}
	authSecret, err := b64.DecodeString(strings.TrimRight(sub.Auth, "="))
	if err != nil {
		return nil, fmt.Errorf("bad auth secret: %w", err)
	}
	if len(authSecret) != 16 {
		return nil, errors.New("auth secret must be 16 bytes")
	}

	curve := ecdh.P256()
	uaPublic, err := curve.NewPublicKey(uaPublicBytes)
	if err != nil {
		return nil, fmt.Errorf("bad client key: %w", err)
	}

	asPrivate, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	asPublicBytes := asPrivate.PublicKey().Bytes()

	shared, err := asPrivate.ECDH(uaPublic)
	if err != nil {
		return nil, fmt.Errorf("ecdh: %w", err)
	}

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}

	// Step 3: the key-derivation info binds both public keys, which is what
	// stops a relayed ciphertext being replayed to a different subscriber.
	var info bytes.Buffer
	info.WriteString("WebPush: info")
	info.WriteByte(0)
	info.Write(uaPublicBytes)
	info.Write(asPublicBytes)
	ikm := hkdf(authSecret, shared, info.Bytes(), 32)

	cek := hkdf(salt, ikm, []byte("Content-Encoding: aes128gcm\x00"), 16)
	nonce := hkdf(salt, ikm, []byte("Content-Encoding: nonce\x00"), 12)

	block, err := aes.NewCipher(cek)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// RFC 8188 padding: a 0x02 delimiter marks the final record.
	padded := append(append([]byte{}, plaintext...), 0x02)
	ciphertext := aead.Seal(nil, nonce, padded, nil)

	// Header: salt(16) | record_size(4) | keyid_len(1) | keyid(as_public)
	var out bytes.Buffer
	out.Write(salt)
	rs := make([]byte, 4)
	binary.BigEndian.PutUint32(rs, 4096)
	out.Write(rs)
	out.WriteByte(byte(len(asPublicBytes)))
	out.Write(asPublicBytes)
	out.Write(ciphertext)
	return out.Bytes(), nil
}

// hkdf is HKDF-SHA256 (extract + expand) for the short lengths this uses.
func hkdf(salt, ikm, info []byte, length int) []byte {
	extractor := hmac.New(sha256.New, salt)
	extractor.Write(ikm)
	prk := extractor.Sum(nil)

	var out []byte
	var block []byte
	for counter := byte(1); len(out) < length; counter++ {
		expander := hmac.New(sha256.New, prk)
		expander.Write(block)
		expander.Write(info)
		expander.Write([]byte{counter})
		block = expander.Sum(nil)
		out = append(out, block...)
	}
	return out[:length]
}

// ── RFC 8292: VAPID ───────────────────────────────────────────────────────────

// vapidHeader builds the Authorization header proving who is sending.
func vapidHeader(endpoint string) (string, error) {
	priv, err := loadVAPIDPrivateKey()
	if err != nil {
		return "", err
	}
	pubB64 := os.Getenv("VAPID_PUBLIC_KEY")

	parsed, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}
	audience := parsed.Scheme + "://" + parsed.Host

	subject := os.Getenv("VAPID_SUBJECT")
	if subject == "" {
		// The RFC requires a contact; a mailto is the conventional default and
		// push services reject a token without one.
		subject = "mailto:careers@nileuniversity.edu.ng"
	}

	header := b64.EncodeToString([]byte(`{"typ":"JWT","alg":"ES256"}`))
	claims, err := json.Marshal(map[string]any{
		"aud": audience,
		// 12 hours: comfortably inside the 24-hour maximum the RFC allows.
		"exp": time.Now().Add(12 * time.Hour).Unix(),
		"sub": subject,
	})
	if err != nil {
		return "", err
	}
	signingInput := header + "." + b64.EncodeToString(claims)

	digest := sha256.Sum256([]byte(signingInput))
	r, s, err := ecdsa.Sign(rand.Reader, priv, digest[:])
	if err != nil {
		return "", err
	}
	// ES256 wants a fixed-width 64-byte R||S, not an ASN.1 signature.
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])

	token := signingInput + "." + b64.EncodeToString(sig)
	return "vapid t=" + token + ", k=" + strings.TrimRight(pubB64, "="), nil
}

// loadVAPIDPrivateKey parses the raw base64url private scalar from the
// environment into an ECDSA key on P-256.
func loadVAPIDPrivateKey() (*ecdsa.PrivateKey, error) {
	raw := os.Getenv("VAPID_PRIVATE_KEY")
	if raw == "" {
		return nil, ErrNotConfigured
	}
	d, err := b64.DecodeString(strings.TrimRight(raw, "="))
	if err != nil {
		return nil, fmt.Errorf("bad private key encoding: %w", err)
	}
	if len(d) != 32 {
		return nil, errors.New("VAPID private key must be 32 bytes")
	}

	priv := new(ecdsa.PrivateKey)
	priv.Curve = elliptic.P256()
	priv.D = new(big.Int).SetBytes(d)
	priv.PublicKey.X, priv.PublicKey.Y = priv.Curve.ScalarBaseMult(d)
	if priv.PublicKey.X == nil {
		return nil, errors.New("VAPID private key is not on the curve")
	}
	return priv, nil
}

// GenerateKeys mints a VAPID keypair for first-time setup, returned in the
// base64url form the environment variables expect.
//
// Exposed so the keys can be produced with the same code that consumes them,
// rather than relying on an external tool whose encoding may differ.
func GenerateKeys() (publicKey, privateKey string, err error) {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return "", "", err
	}
	pub := elliptic.Marshal(priv.Curve, priv.PublicKey.X, priv.PublicKey.Y)
	d := make([]byte, 32)
	priv.D.FillBytes(d)
	return b64.EncodeToString(pub), b64.EncodeToString(d), nil
}
