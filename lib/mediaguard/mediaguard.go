// Package mediaguard validates user uploads before they reach storage.
//
// The upload endpoint previously trusted the client-supplied Content-Type
// header verbatim and stored whatever bytes arrived. That is an unauthenticated
// content-type confusion vector: an attacker uploads an HTML or SVG document
// declaring itself "image/png", the blob store serves it back from the app's
// own origin, and any viewer executes the attacker's script with the victim's
// session.
//
// This package therefore ignores what the client claims and sniffs the actual
// bytes, then enforces a strict allowlist. It is pure and dependency-free so
// it can be unit-tested exhaustively without a network or a blob store.
package mediaguard

import (
	"bytes"
	"errors"
	"fmt"
	"path"
	"strings"
	"unicode"
)

// Category groups the kinds of upload the product supports. Callers declare
// what a given endpoint accepts, so an avatar endpoint cannot be used to smuggle
// a PDF and a document endpoint cannot be used to host a video.
type Category string

const (
	CategoryImage    Category = "image"
	CategoryVideo    Category = "video"
	CategoryDocument Category = "document"
	CategoryAudio    Category = "audio"
)

// Size ceilings, in bytes. Deliberately conservative: the audience is on
// Nigerian mobile data, and an unbounded upload is both a cost problem and a
// denial-of-service vector against the function's memory limit.
const (
	MaxImageBytes    int64 = 8 << 20  // 8 MB
	MaxVideoBytes    int64 = 64 << 20 // 64 MB
	MaxAudioBytes    int64 = 16 << 20 // 16 MB
	MaxDocumentBytes int64 = 10 << 20 // 10 MB
	// MaxAnyBytes is the hard ceiling used when parsing the multipart form,
	// before the category is known.
	MaxAnyBytes int64 = 64 << 20
)

// SniffLen is how many leading bytes are needed to identify every supported
// format. Callers must supply at least this many (or the whole file if smaller).
const SniffLen = 512

var (
	ErrEmpty            = errors.New("the file is empty")
	ErrTooLarge         = errors.New("the file is too large")
	ErrUnsupportedType  = errors.New("that file type is not supported")
	ErrCategoryMismatch = errors.New("that file type is not allowed here")
)

// Format is a recognised, allowlisted media format.
type Format struct {
	// MIME is the authoritative content type, derived from the bytes — never
	// from the client.
	MIME string
	// Ext is the canonical extension, used to build the stored filename.
	Ext string
	// Category groups the format.
	Category Category
	// MaxBytes is the ceiling for this category.
	MaxBytes int64
}

// signature is one magic-byte rule: the format is confirmed when magic
// matches the file bytes starting at offset.
type signature struct {
	offset int
	magic  []byte
	format Format
}

var (
	imgJPEG = Format{MIME: "image/jpeg", Ext: ".jpg", Category: CategoryImage, MaxBytes: MaxImageBytes}
	imgPNG  = Format{MIME: "image/png", Ext: ".png", Category: CategoryImage, MaxBytes: MaxImageBytes}
	imgGIF  = Format{MIME: "image/gif", Ext: ".gif", Category: CategoryImage, MaxBytes: MaxImageBytes}
	imgWEBP = Format{MIME: "image/webp", Ext: ".webp", Category: CategoryImage, MaxBytes: MaxImageBytes}
	imgHEIC = Format{MIME: "image/heic", Ext: ".heic", Category: CategoryImage, MaxBytes: MaxImageBytes}

	vidMP4  = Format{MIME: "video/mp4", Ext: ".mp4", Category: CategoryVideo, MaxBytes: MaxVideoBytes}
	vidWEBM = Format{MIME: "video/webm", Ext: ".webm", Category: CategoryVideo, MaxBytes: MaxVideoBytes}
	vidQT   = Format{MIME: "video/quicktime", Ext: ".mov", Category: CategoryVideo, MaxBytes: MaxVideoBytes}

	audMP3 = Format{MIME: "audio/mpeg", Ext: ".mp3", Category: CategoryAudio, MaxBytes: MaxAudioBytes}
	audM4A = Format{MIME: "audio/mp4", Ext: ".m4a", Category: CategoryAudio, MaxBytes: MaxAudioBytes}
	audOGG = Format{MIME: "audio/ogg", Ext: ".ogg", Category: CategoryAudio, MaxBytes: MaxAudioBytes}
	audWAV = Format{MIME: "audio/wav", Ext: ".wav", Category: CategoryAudio, MaxBytes: MaxAudioBytes}

	docPDF  = Format{MIME: "application/pdf", Ext: ".pdf", Category: CategoryDocument, MaxBytes: MaxDocumentBytes}
	docDOCX = Format{MIME: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Ext: ".docx", Category: CategoryDocument, MaxBytes: MaxDocumentBytes}
)

// signatures is the complete allowlist, most specific first.
//
// Note what is deliberately ABSENT: SVG and HTML. Both are documents that
// browsers execute, and an SVG served from our origin can carry <script>.
// There is no safe way to serve user-supplied SVG from the app origin without
// a separate sandboxed domain, so it is simply not accepted.
var signatures = []signature{
	{offset: 0, magic: []byte{0xFF, 0xD8, 0xFF}, format: imgJPEG},
	{offset: 0, magic: []byte("\x89PNG\r\n\x1a\n"), format: imgPNG},
	{offset: 0, magic: []byte("GIF87a"), format: imgGIF},
	{offset: 0, magic: []byte("GIF89a"), format: imgGIF},

	{offset: 0, magic: []byte("%PDF-"), format: docPDF},

	{offset: 0, magic: []byte("OggS"), format: audOGG},
	{offset: 0, magic: []byte("ID3"), format: audMP3},
	{offset: 0, magic: []byte{0xFF, 0xFB}, format: audMP3},
	{offset: 0, magic: []byte{0xFF, 0xF3}, format: audMP3},
	{offset: 0, magic: []byte{0xFF, 0xF2}, format: audMP3},

	{offset: 0, magic: []byte{0x1A, 0x45, 0xDF, 0xA3}, format: vidWEBM}, // Matroska/WebM
}

// riffKinds disambiguates the RIFF container, which carries both WebP and WAV.
var riffKinds = map[string]Format{
	"WEBP": imgWEBP,
	"WAVE": audWAV,
}

// ftypBrands disambiguates the ISO base media container (MP4/MOV/HEIC/M4A),
// which all share the "ftyp" box at offset 4 and differ only by brand.
var ftypBrands = map[string]Format{
	"isom": vidMP4, "iso2": vidMP4, "mp41": vidMP4, "mp42": vidMP4,
	"avc1": vidMP4, "dash": vidMP4, "MSNV": vidMP4,
	"qt  ": vidQT,
	"heic": imgHEIC, "heix": imgHEIC, "hevc": imgHEIC, "mif1": imgHEIC,
	"M4A ": audM4A, "M4B ": audM4A,
}

// zipMagic opens the ZIP container. Only DOCX is accepted from it; a bare
// .zip is rejected because we cannot inspect what is inside it.
var zipMagic = []byte{0x50, 0x4B, 0x03, 0x04}

// Detect identifies the format of head (the first bytes of a file). It never
// consults any client-supplied metadata.
//
// head should be at least SniffLen bytes, or the entire file when shorter.
func Detect(head []byte) (Format, error) {
	if len(head) == 0 {
		return Format{}, ErrEmpty
	}

	// RIFF: "RIFF" ....(size).... <kind>
	if len(head) >= 12 && bytes.Equal(head[0:4], []byte("RIFF")) {
		if f, ok := riffKinds[string(head[8:12])]; ok {
			return f, nil
		}
		return Format{}, ErrUnsupportedType
	}

	// ISO base media: ....(size).... "ftyp" <brand>
	if len(head) >= 12 && bytes.Equal(head[4:8], []byte("ftyp")) {
		if f, ok := ftypBrands[string(head[8:12])]; ok {
			return f, nil
		}
		// An unknown brand in a well-formed ftyp box is still a media
		// container, but we do not guess — an unrecognised brand is rejected.
		return Format{}, ErrUnsupportedType
	}

	// ZIP-based Office documents. The DOCX content type marker appears early
	// in the central directory for files produced by real word processors.
	if len(head) >= 4 && bytes.Equal(head[0:4], zipMagic) {
		if bytes.Contains(head, []byte("word/")) ||
			bytes.Contains(head, []byte("wordprocessingml")) {
			return docDOCX, nil
		}
		return Format{}, ErrUnsupportedType
	}

	for _, sig := range signatures {
		end := sig.offset + len(sig.magic)
		if len(head) < end {
			continue
		}
		if bytes.Equal(head[sig.offset:end], sig.magic) {
			return sig.format, nil
		}
	}

	return Format{}, ErrUnsupportedType
}

// Validate detects the format and confirms it is permitted for the given
// categories and size. Passing no categories permits any allowlisted format.
func Validate(head []byte, size int64, allowed ...Category) (Format, error) {
	if size <= 0 {
		return Format{}, ErrEmpty
	}
	f, err := Detect(head)
	if err != nil {
		return Format{}, err
	}
	if size > f.MaxBytes {
		return Format{}, fmt.Errorf("%w: %s files are limited to %s",
			ErrTooLarge, f.Category, HumanSize(f.MaxBytes))
	}
	if len(allowed) > 0 && !containsCategory(allowed, f.Category) {
		return Format{}, fmt.Errorf("%w: expected %s", ErrCategoryMismatch, joinCategories(allowed))
	}
	return f, nil
}

func containsCategory(list []Category, c Category) bool {
	for _, v := range list {
		if v == c {
			return true
		}
	}
	return false
}

func joinCategories(list []Category) string {
	parts := make([]string, 0, len(list))
	for _, c := range list {
		parts = append(parts, string(c))
	}
	return strings.Join(parts, " or ")
}

// HumanSize renders a byte count for user-facing error copy.
func HumanSize(b int64) string {
	switch {
	case b >= 1<<20:
		return fmt.Sprintf("%dMB", b/(1<<20))
	case b >= 1<<10:
		return fmt.Sprintf("%dKB", b/(1<<10))
	default:
		return fmt.Sprintf("%dB", b)
	}
}

// SafeFilename produces a storage-safe filename from a user-supplied one,
// forcing the extension to match the DETECTED format rather than whatever the
// user named the file.
//
// This matters as much as the sniffing: storing attacker-controlled
// "payload.html" with a PNG's bytes would still let the blob store serve it as
// HTML based on the extension.
func SafeFilename(original string, f Format) string {
	base := path.Base(strings.ReplaceAll(original, "\\", "/"))
	base = strings.TrimSuffix(base, path.Ext(base))

	var b strings.Builder
	for _, r := range base {
		switch {
		case unicode.IsLetter(r) && r < unicode.MaxASCII,
			unicode.IsDigit(r):
			b.WriteRune(unicode.ToLower(r))
		case r == '-' || r == '_':
			b.WriteRune(r)
		case r == ' ' || r == '.':
			b.WriteRune('-')
		}
	}
	name := strings.Trim(b.String(), "-_")
	// Collapse runs of separators introduced by stripped characters.
	for strings.Contains(name, "--") {
		name = strings.ReplaceAll(name, "--", "-")
	}
	if name == "" {
		name = "upload"
	}
	if len(name) > 60 {
		name = strings.Trim(name[:60], "-_")
	}
	return name + f.Ext
}

// IsRenderableInline reports whether a format may be served with an inline
// Content-Disposition. Anything else must be served as an attachment so the
// browser downloads it instead of rendering it in our origin.
func IsRenderableInline(f Format) bool {
	return f.Category == CategoryImage || f.Category == CategoryVideo || f.Category == CategoryAudio
}
