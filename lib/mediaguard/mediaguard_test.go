package mediaguard

import (
	"errors"
	"strings"
	"testing"
)

// pad extends a header to SniffLen so Detect sees a realistic buffer.
func pad(prefix []byte) []byte {
	out := make([]byte, SniffLen)
	copy(out, prefix)
	return out
}

func TestDetectRecognisesSupportedFormats(t *testing.T) {
	cases := []struct {
		name string
		head []byte
		want Format
	}{
		{"jpeg", pad([]byte{0xFF, 0xD8, 0xFF, 0xE0}), imgJPEG},
		{"png", pad([]byte("\x89PNG\r\n\x1a\n")), imgPNG},
		{"gif87", pad([]byte("GIF87a")), imgGIF},
		{"gif89", pad([]byte("GIF89a")), imgGIF},
		{"webp", pad(append([]byte("RIFF"), append([]byte{0, 0, 0, 0}, []byte("WEBP")...)...)), imgWEBP},
		{"wav", pad(append([]byte("RIFF"), append([]byte{0, 0, 0, 0}, []byte("WAVE")...)...)), audWAV},
		{"mp4", pad(append([]byte{0, 0, 0, 0x20}, append([]byte("ftyp"), []byte("isom")...)...)), vidMP4},
		{"mov", pad(append([]byte{0, 0, 0, 0x14}, append([]byte("ftyp"), []byte("qt  ")...)...)), vidQT},
		{"heic", pad(append([]byte{0, 0, 0, 0x18}, append([]byte("ftyp"), []byte("heic")...)...)), imgHEIC},
		{"m4a", pad(append([]byte{0, 0, 0, 0x18}, append([]byte("ftyp"), []byte("M4A ")...)...)), audM4A},
		{"webm", pad([]byte{0x1A, 0x45, 0xDF, 0xA3}), vidWEBM},
		{"ogg", pad([]byte("OggS")), audOGG},
		{"mp3-id3", pad([]byte("ID3\x04")), audMP3},
		{"mp3-frame", pad([]byte{0xFF, 0xFB, 0x90}), audMP3},
		{"pdf", pad([]byte("%PDF-1.7")), docPDF},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := Detect(c.head)
			if err != nil {
				t.Fatalf("Detect: %v", err)
			}
			if got.MIME != c.want.MIME {
				t.Errorf("MIME = %q, want %q", got.MIME, c.want.MIME)
			}
			if got.Category != c.want.Category {
				t.Errorf("Category = %q, want %q", got.Category, c.want.Category)
			}
		})
	}
}

// THE core security test. A file whose bytes are HTML must be rejected no
// matter what the client says it is — this is the content-type confusion that
// turns an upload endpoint into stored XSS on our own origin.
func TestDetectRejectsExecutableDocuments(t *testing.T) {
	hostile := map[string][]byte{
		"html":            []byte("<!DOCTYPE html><script>alert(document.cookie)</script>"),
		"html-no-doctype": []byte("<html><body><script>fetch('/api/auth/me')</script>"),
		"svg-with-script": []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
		"svg-plain":       []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>`),
		"xml":             []byte(`<?xml version="1.0"?><root/>`),
		"php":             []byte("<?php system($_GET['c']); ?>"),
		"shell":           []byte("#!/bin/sh\nrm -rf /\n"),
		"elf":             []byte{0x7F, 'E', 'L', 'F', 2, 1, 1},
		"windows-pe":      []byte{'M', 'Z', 0x90, 0x00},
		"bare-zip":        []byte{0x50, 0x4B, 0x03, 0x04, 0x14, 0x00},
		"plain-text":      []byte("just some text"),
		"json":            []byte(`{"a":1}`),
	}
	for name, body := range hostile {
		t.Run(name, func(t *testing.T) {
			if f, err := Detect(pad(body)); err == nil {
				t.Fatalf("Detect accepted hostile %s as %q — this is an XSS vector", name, f.MIME)
			}
		})
	}
}

// Polyglot defence: a file that starts with valid PNG magic but continues with
// script is still stored as a PNG, and the browser will render it as an image
// because the stored Content-Type comes from the sniff, not the payload.
// What must NOT happen is the reverse — script bytes accepted as an image.
func TestDetectIgnoresClientClaims(t *testing.T) {
	// There is no parameter through which a caller can assert a type: Detect
	// takes only bytes. This test documents that contract so a future change
	// that adds a "declaredType" argument has to break it deliberately.
	head := pad([]byte("<script>alert(1)</script>"))
	if _, err := Detect(head); !errors.Is(err, ErrUnsupportedType) {
		t.Fatalf("expected ErrUnsupportedType, got %v", err)
	}
}

func TestDetectEmpty(t *testing.T) {
	if _, err := Detect(nil); !errors.Is(err, ErrEmpty) {
		t.Errorf("Detect(nil) = %v, want ErrEmpty", err)
	}
	if _, err := Detect([]byte{}); !errors.Is(err, ErrEmpty) {
		t.Errorf("Detect(empty) = %v, want ErrEmpty", err)
	}
}

// A truncated header must not panic or index out of range.
func TestDetectHandlesTruncatedInput(t *testing.T) {
	full := pad(append([]byte("RIFF"), append([]byte{0, 0, 0, 0}, []byte("WEBP")...)...))
	for n := 1; n < 16; n++ {
		func() {
			defer func() {
				if rec := recover(); rec != nil {
					t.Fatalf("Detect panicked on %d-byte input: %v", n, rec)
				}
			}()
			Detect(full[:n])
		}()
	}
}

func TestValidateEnforcesSizeCeiling(t *testing.T) {
	png := pad([]byte("\x89PNG\r\n\x1a\n"))
	if _, err := Validate(png, MaxImageBytes+1, CategoryImage); !errors.Is(err, ErrTooLarge) {
		t.Errorf("oversized image accepted: %v", err)
	}
	if _, err := Validate(png, MaxImageBytes, CategoryImage); err != nil {
		t.Errorf("image at the ceiling rejected: %v", err)
	}
}

// Category confinement stops an avatar endpoint being used to host video, or a
// document endpoint being used to serve images.
func TestValidateEnforcesCategory(t *testing.T) {
	pdf := pad([]byte("%PDF-1.7"))
	if _, err := Validate(pdf, 1000, CategoryImage); !errors.Is(err, ErrCategoryMismatch) {
		t.Errorf("a PDF was accepted by an image-only endpoint: %v", err)
	}
	if _, err := Validate(pdf, 1000, CategoryDocument); err != nil {
		t.Errorf("a PDF was rejected by a document endpoint: %v", err)
	}
	if _, err := Validate(pdf, 1000); err != nil {
		t.Errorf("no category filter should permit any allowlisted format: %v", err)
	}
}

func TestValidateRejectsZeroSize(t *testing.T) {
	png := pad([]byte("\x89PNG\r\n\x1a\n"))
	if _, err := Validate(png, 0, CategoryImage); !errors.Is(err, ErrEmpty) {
		t.Errorf("zero-size upload accepted: %v", err)
	}
}

// The stored extension must come from the detected format, never from the
// user-supplied name — otherwise "evil.html" keeps its dangerous extension.
func TestSafeFilenameForcesDetectedExtension(t *testing.T) {
	got := SafeFilename("evil.html", imgPNG)
	if !strings.HasSuffix(got, ".png") {
		t.Errorf("SafeFilename = %q, want a .png extension", got)
	}
	if strings.Contains(got, ".html") {
		t.Errorf("SafeFilename = %q, still carries the dangerous extension", got)
	}
}

func TestSafeFilenameStripsTraversalAndSeparators(t *testing.T) {
	for _, in := range []string{
		"../../../etc/passwd",
		`..\..\windows\system32\cmd`,
		"/absolute/path/file",
		"a/b/c",
	} {
		got := SafeFilename(in, imgJPEG)
		if strings.ContainsAny(got, `/\`) {
			t.Errorf("SafeFilename(%q) = %q, still contains a path separator", in, got)
		}
		if strings.Contains(got, "..") {
			t.Errorf("SafeFilename(%q) = %q, still contains a traversal sequence", in, got)
		}
	}
}

func TestSafeFilenameHandlesHostileNames(t *testing.T) {
	cases := []string{
		"", "   ", "...", "%00.png", "a b c.png",
		strings.Repeat("x", 500) + ".png",
		"файл.png", "😀.png",
	}
	for _, in := range cases {
		got := SafeFilename(in, imgPNG)
		if got == "" || got == ".png" {
			t.Errorf("SafeFilename(%q) = %q, want a usable name", in, got)
		}
		if len(got) > 70 {
			t.Errorf("SafeFilename(%q) = %q (%d chars), too long", in, got, len(got))
		}
		if !strings.HasSuffix(got, ".png") {
			t.Errorf("SafeFilename(%q) = %q, lost its extension", in, got)
		}
	}
}

func TestIsRenderableInline(t *testing.T) {
	if IsRenderableInline(docPDF) {
		t.Error("a PDF must not be served inline from our origin")
	}
	if IsRenderableInline(docDOCX) {
		t.Error("a DOCX must not be served inline from our origin")
	}
	if !IsRenderableInline(imgPNG) || !IsRenderableInline(vidMP4) {
		t.Error("images and video should be renderable inline")
	}
}

func TestHumanSize(t *testing.T) {
	cases := map[int64]string{
		512:           "512B",
		2048:          "2KB",
		8 << 20:       "8MB",
		MaxVideoBytes: "64MB",
	}
	for in, want := range cases {
		if got := HumanSize(in); got != want {
			t.Errorf("HumanSize(%d) = %q, want %q", in, got, want)
		}
	}
}
