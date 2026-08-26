package mw

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// api/auth's dev-login mints a real signed session for an arbitrary role,
// staff included, and its route is published in vercel.json. The only thing
// standing between a stranger and a staff session is this host check, so pin
// its behaviour — particularly the hosts that merely look local.
func TestIsLocalRequestRejectsRemoteHosts(t *testing.T) {
	for _, host := range []string{
		"nile-connect.vercel.app",
		"nile-connect.vercel.app:443",
		"evil.example.com",
		"localhost.evil.example.com",
		"127.0.0.1.evil.example.com",
		"notlocalhost",
		"",
	} {
		r := httptest.NewRequest(http.MethodGet, "/api/auth?path=dev-login&role=staff", nil)
		r.Host = host
		if IsLocalRequest(r) {
			t.Errorf("IsLocalRequest(%q) = true, want false", host)
		}
	}
}

func TestIsLocalRequestAcceptsLoopback(t *testing.T) {
	for _, host := range []string{
		"localhost", "localhost:3000", "LOCALHOST:3000",
		"127.0.0.1", "127.0.0.1:5173", "[::1]:3000",
	} {
		r := httptest.NewRequest(http.MethodGet, "/api/auth?path=dev-login&role=student", nil)
		r.Host = host
		if !IsLocalRequest(r) {
			t.Errorf("IsLocalRequest(%q) = false, want true", host)
		}
	}
}
