// Package textparse extracts @mentions and #hashtags from user-authored text.
//
// It is deliberately pure and dependency-free: parsing is the same on every
// write path (posts, comments, stories, group posts), so it lives in one place
// with its own tests rather than being re-implemented per handler with subtly
// different regexes.
//
// Security note: this package NEVER produces HTML. It returns plain tokens and
// index spans; rendering is the client's job. Building HTML here would create
// an XSS sink on every surface that displays user text.
package textparse

import (
	"sort"
	"strings"
	"unicode"
)

const (
	// MaxHandleLen bounds a username token. Longer runs are truncated at the
	// boundary rather than rejected, so "@someverylongname..." still resolves
	// its valid prefix.
	MaxHandleLen = 32
	// MaxTagLen bounds a hashtag.
	MaxTagLen = 64
	// MaxMentionsPerItem caps how many mentions one item may notify. Beyond
	// this the extras are still highlighted but generate no notification —
	// the cheapest effective defence against mention-spam blasts.
	MaxMentionsPerItem = 20
	// MaxHashtagsPerItem caps tags indexed per item, so a post cannot stuff
	// itself into a hundred tag feeds.
	MaxHashtagsPerItem = 10
)

// Span is a half-open [Start, End) rune-index range into the source string,
// carrying the normalised token it refers to.
type Span struct {
	Start int    `json:"start"`
	End   int    `json:"end"`
	Value string `json:"value"`
}

// Result is everything extracted from one piece of text.
type Result struct {
	// Handles are unique, lowercased usernames without the leading '@',
	// in first-appearance order.
	Handles []string
	// Tags are unique, lowercased hashtags without the leading '#',
	// in first-appearance order.
	Tags []string
	// MentionSpans/TagSpans locate every occurrence, including repeats, so a
	// client can highlight each one.
	MentionSpans []Span
	TagSpans     []Span
}

// isHandleRune reports whether r may appear inside a username.
// Letters, digits, underscore, dot and hyphen — matching the conservative
// intersection of what Campus One usernames and common handles allow.
func isHandleRune(r rune) bool {
	return r == '_' || r == '.' || r == '-' ||
		unicode.IsDigit(r) ||
		(unicode.IsLetter(r) && r < unicode.MaxASCII)
}

// isTagRune reports whether r may appear inside a hashtag. Unicode letters are
// allowed so non-English tags work, but punctuation and symbols are not.
func isTagRune(r rune) bool {
	return r == '_' || unicode.IsDigit(r) || unicode.IsLetter(r)
}

// canStartToken reports whether a trigger character at position i is at a
// token boundary. Requiring the preceding rune to be whitespace or punctuation
// stops "email@example.com" from parsing "@example" as a mention, and
// "C#" / "a#b" from producing stray tags.
func canStartToken(runes []rune, i int) bool {
	if i == 0 {
		return true
	}
	prev := runes[i-1]
	if unicode.IsLetter(prev) || unicode.IsDigit(prev) || prev == '_' {
		return false
	}
	// A preceding '@' or '#' means a doubled trigger ("@@name"), which we
	// treat as not a token start so the second one is not double-counted.
	return prev != '@' && prev != '#'
}

// trimTrailingPunctuation removes trailing dots and hyphens from a token, so
// "@ada." at the end of a sentence resolves to "ada". Interior dots are kept
// because "ada.bello" is a legitimate handle.
func trimTrailingPunctuation(s string) string {
	return strings.TrimRight(s, ".-_")
}

// Parse extracts mentions and hashtags from text.
//
// It is intentionally tolerant: unparseable or over-long tokens are skipped
// rather than erroring, because this runs on every post and a parse failure
// must never block a user from publishing.
func Parse(text string) Result {
	res := Result{
		Handles:      []string{},
		Tags:         []string{},
		MentionSpans: []Span{},
		TagSpans:     []Span{},
	}
	if text == "" {
		return res
	}

	runes := []rune(text)
	seenHandle := map[string]bool{}
	seenTag := map[string]bool{}

	for i := 0; i < len(runes); i++ {
		trigger := runes[i]
		if trigger != '@' && trigger != '#' {
			continue
		}
		if !canStartToken(runes, i) {
			continue
		}

		isMention := trigger == '@'
		limit := MaxTagLen
		allowed := isTagRune
		if isMention {
			limit = MaxHandleLen
			allowed = isHandleRune
		}

		j := i + 1
		for j < len(runes) && j-i-1 < limit && allowed(runes[j]) {
			j++
		}
		if j == i+1 {
			continue // bare "@" or "#"
		}

		raw := string(runes[i+1 : j])
		value := strings.ToLower(trimTrailingPunctuation(raw))
		if value == "" {
			continue
		}
		// A hashtag of only digits ("#1", "#2026") is almost always a figure
		// rather than a topic, so it is highlighted but not indexed.
		if !isMention && isAllDigits(value) {
			continue
		}

		span := Span{Start: i, End: j, Value: value}
		if isMention {
			res.MentionSpans = append(res.MentionSpans, span)
			if !seenHandle[value] {
				seenHandle[value] = true
				res.Handles = append(res.Handles, value)
			}
		} else {
			res.TagSpans = append(res.TagSpans, span)
			if !seenTag[value] {
				seenTag[value] = true
				res.Tags = append(res.Tags, value)
			}
		}

		i = j - 1 // continue scanning after the token
	}

	if len(res.Handles) > MaxMentionsPerItem {
		res.Handles = res.Handles[:MaxMentionsPerItem]
	}
	if len(res.Tags) > MaxHashtagsPerItem {
		res.Tags = res.Tags[:MaxHashtagsPerItem]
	}
	return res
}

func isAllDigits(s string) bool {
	for _, r := range s {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return len(s) > 0
}

// NormalizeTag canonicalises a hashtag supplied directly by a client (a tag
// feed URL, a search query) using the same rules as Parse, so
// /explore/tags/StudyGroup and #studygroup resolve to one row.
func NormalizeTag(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "#")
	var b strings.Builder
	for _, r := range raw {
		if isTagRune(r) {
			b.WriteRune(unicode.ToLower(r))
		}
	}
	out := b.String()
	if len([]rune(out)) > MaxTagLen {
		out = string([]rune(out)[:MaxTagLen])
	}
	if isAllDigits(out) {
		return ""
	}
	return out
}

// NormalizeHandle canonicalises a username supplied directly by a client.
func NormalizeHandle(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "@")
	var b strings.Builder
	for _, r := range raw {
		if isHandleRune(r) {
			b.WriteRune(unicode.ToLower(r))
		}
	}
	out := trimTrailingPunctuation(b.String())
	if len([]rune(out)) > MaxHandleLen {
		out = string([]rune(out)[:MaxHandleLen])
	}
	return out
}

// Excerpt returns a plain-text summary of at most maxRunes runes, collapsing
// whitespace and cutting on a word boundary. Used for notification bodies,
// report snapshots and link previews, where embedding the full body would be
// wasteful and, in the report case, unbounded.
func Excerpt(text string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	collapsed := strings.Join(strings.Fields(text), " ")
	runes := []rune(collapsed)
	if len(runes) <= maxRunes {
		return collapsed
	}
	cut := string(runes[:maxRunes])
	// Prefer the last space so a word is not sliced in half, but only if that
	// keeps a reasonable amount of the excerpt.
	if idx := strings.LastIndex(cut, " "); idx > maxRunes/2 {
		cut = cut[:idx]
	}
	return strings.TrimRight(cut, " ,.;:") + "…"
}

// SortedTags returns tags in a stable alphabetical order. Used where a
// deterministic order matters (dedup keys, test assertions) rather than the
// first-appearance order Parse returns.
func SortedTags(tags []string) []string {
	out := make([]string, len(tags))
	copy(out, tags)
	sort.Strings(out)
	return out
}
