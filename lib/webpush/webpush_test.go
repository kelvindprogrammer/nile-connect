package webpush

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// Push must degrade to a no-op, never an error that breaks the action that
// triggered it — the same contract lib/email has without a Resend key.
func TestNotConfiguredIsSafe(t *testing.T) {
	os.Unsetenv("VAPID_PUBLIC_KEY")
	os.Unsetenv("VAPID_PRIVATE_KEY")

	if Configured() {
		t.Fatal("Configured() true with no keys set")
	}
	err := Send(Subscription{Endpoint: "https://example.com/x", P256dh: "a", Auth: "b"},
		Payload{Title: "hi"}, 60)
	if err != ErrNotConfigured {
		t.Errorf("Send with no config = %v, want ErrNotConfigured", err)
	}
}

func TestGenerateKeysRoundTrips(t *testing.T) {
	pub, priv, err := GenerateKeys()
	if err != nil {
		t.Fatalf("GenerateKeys: %v", err)
	}
	if pub == "" || priv == "" {
		t.Fatal("GenerateKeys returned an empty key")
	}
	// Both must be unpadded base64url — a '=' or '+' breaks the header.
	for name, key := range map[string]string{"public": pub, "private": priv} {
		if strings.ContainsAny(key, "=+/") {
			t.Errorf("%s key is not base64url-unpadded: %q", name, key)
		}
	}

	pubBytes, err := b64.DecodeString(pub)
	if err != nil {
		t.Fatalf("public key does not decode: %v", err)
	}
	// An uncompressed P-256 point is 65 bytes beginning 0x04.
	if len(pubBytes) != 65 || pubBytes[0] != 0x04 {
		t.Errorf("public key is %d bytes starting %#x, want 65 starting 0x04", len(pubBytes), pubBytes[0])
	}
	privBytes, err := b64.DecodeString(priv)
	if err != nil || len(privBytes) != 32 {
		t.Errorf("private key is %d bytes, want 32", len(privBytes))
	}
}

// The generated keys must be loadable by the code that consumes them —
// otherwise setup silently produces a keypair the sender rejects.
func TestGeneratedKeysAreLoadable(t *testing.T) {
	pub, priv, err := GenerateKeys()
	if err != nil {
		t.Fatalf("GenerateKeys: %v", err)
	}
	os.Setenv("VAPID_PUBLIC_KEY", pub)
	os.Setenv("VAPID_PRIVATE_KEY", priv)
	defer func() {
		os.Unsetenv("VAPID_PUBLIC_KEY")
		os.Unsetenv("VAPID_PRIVATE_KEY")
	}()

	if !Configured() {
		t.Fatal("Configured() false with generated keys set")
	}
	key, err := loadVAPIDPrivateKey()
	if err != nil {
		t.Fatalf("loadVAPIDPrivateKey: %v", err)
	}
	if key.D == nil || key.PublicKey.X == nil {
		t.Fatal("loaded key is incomplete")
	}
	if !key.Curve.IsOnCurve(key.PublicKey.X, key.PublicKey.Y) {
		t.Error("derived public point is not on P-256")
	}
}

func TestVapidHeaderShape(t *testing.T) {
	pub, priv, _ := GenerateKeys()
	os.Setenv("VAPID_PUBLIC_KEY", pub)
	os.Setenv("VAPID_PRIVATE_KEY", priv)
	defer func() {
		os.Unsetenv("VAPID_PUBLIC_KEY")
		os.Unsetenv("VAPID_PRIVATE_KEY")
	}()

	header, err := vapidHeader("https://fcm.googleapis.com/fcm/send/abc123")
	if err != nil {
		t.Fatalf("vapidHeader: %v", err)
	}
	if !strings.HasPrefix(header, "vapid t=") || !strings.Contains(header, ", k=") {
		t.Fatalf("header does not match the RFC 8292 shape: %q", header)
	}

	token := strings.TrimPrefix(strings.Split(header, ", k=")[0], "vapid t=")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("JWT has %d parts, want 3", len(parts))
	}
	// The signature must be a fixed-width 64-byte R||S, not ASN.1.
	sig, err := b64.DecodeString(parts[2])
	if err != nil || len(sig) != 64 {
		t.Errorf("signature is %d bytes, want a 64-byte ES256 R||S", len(sig))
	}

	claimBytes, err := b64.DecodeString(parts[1])
	if err != nil {
		t.Fatalf("claims do not decode: %v", err)
	}
	var claims map[string]any
	if err := json.Unmarshal(claimBytes, &claims); err != nil {
		t.Fatalf("claims are not JSON: %v", err)
	}
	// The audience must be the push service ORIGIN only — including the path
	// makes the token invalid.
	if claims["aud"] != "https://fcm.googleapis.com" {
		t.Errorf("aud = %v, want the origin only", claims["aud"])
	}
	if claims["sub"] == nil || claims["sub"] == "" {
		t.Error("sub is required by RFC 8292; push services reject a token without it")
	}
	if claims["exp"] == nil {
		t.Error("exp is required")
	}
}

// Malformed subscription keys must produce a clear error rather than a panic —
// these come from the browser and can be anything after a storage corruption.
func TestEncryptRejectsBadKeys(t *testing.T) {
	cases := []Subscription{
		{Endpoint: "https://x", P256dh: "not-base64!!", Auth: "AAAAAAAAAAAAAAAAAAAAAA"},
		{Endpoint: "https://x", P256dh: "", Auth: ""},
		{Endpoint: "https://x", P256dh: b64.EncodeToString([]byte("tooshort")), Auth: b64.EncodeToString(make([]byte, 16))},
		// A 16-byte auth secret is mandatory; anything else is invalid.
		{Endpoint: "https://x", P256dh: b64.EncodeToString(make([]byte, 65)), Auth: b64.EncodeToString(make([]byte, 8))},
	}
	for i, sub := range cases {
		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("case %d panicked on malformed keys: %v", i, r)
				}
			}()
			if _, err := encrypt(sub, []byte("payload")); err == nil {
				t.Errorf("case %d: encrypt accepted malformed keys", i)
			}
		}()
	}
}

// HKDF is the heart of the encryption; a wrong output length silently produces
// an undecryptable message that the push service still accepts.
func TestHkdfLengths(t *testing.T) {
	salt := make([]byte, 16)
	ikm := make([]byte, 32)
	for _, n := range []int{12, 16, 32, 64} {
		if got := hkdf(salt, ikm, []byte("info"), n); len(got) != n {
			t.Errorf("hkdf length = %d, want %d", len(got), n)
		}
	}
}

func TestHkdfIsDeterministicAndSaltSensitive(t *testing.T) {
	ikm := []byte("input key material")
	info := []byte("Content-Encoding: aes128gcm\x00")
	a := hkdf([]byte("salt-one........"), ikm, info, 16)
	b := hkdf([]byte("salt-one........"), ikm, info, 16)
	c := hkdf([]byte("salt-two........"), ikm, info, 16)

	if string(a) != string(b) {
		t.Error("hkdf is not deterministic for identical inputs")
	}
	if string(a) == string(c) {
		t.Error("hkdf ignored the salt — every message would share a key")
	}
}
