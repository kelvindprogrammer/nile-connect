package textparse

import (
	"reflect"
	"strings"
	"testing"
)

func TestParseExtractsMentionsAndTags(t *testing.T) {
	got := Parse("hey @Ada and @bello_j check #StudyGroup and #exams")
	if !reflect.DeepEqual(got.Handles, []string{"ada", "bello_j"}) {
		t.Errorf("Handles = %v", got.Handles)
	}
	if !reflect.DeepEqual(got.Tags, []string{"studygroup", "exams"}) {
		t.Errorf("Tags = %v", got.Tags)
	}
}

// An email address must not yield a mention. This is the single most common
// false positive and it would otherwise notify a stranger every time someone
// pastes an address into a post.
func TestParseIgnoresEmailAddresses(t *testing.T) {
	got := Parse("mail me at ada.bello@example.com please")
	if len(got.Handles) != 0 {
		t.Errorf("expected no handles from an email, got %v", got.Handles)
	}
}

func TestParseIgnoresMidWordTriggers(t *testing.T) {
	for _, in := range []string{"C#", "a#b", "foo@bar", "x@y"} {
		got := Parse(in)
		if len(got.Handles) != 0 || len(got.Tags) != 0 {
			t.Errorf("Parse(%q) should find nothing, got handles=%v tags=%v", in, got.Handles, got.Tags)
		}
	}
}

func TestParseDeduplicatesButKeepsEverySpan(t *testing.T) {
	got := Parse("@ada @ada @ADA")
	if !reflect.DeepEqual(got.Handles, []string{"ada"}) {
		t.Errorf("Handles = %v, want one deduped entry", got.Handles)
	}
	if len(got.MentionSpans) != 3 {
		t.Errorf("MentionSpans = %d, want 3 so every occurrence can be highlighted", len(got.MentionSpans))
	}
}

func TestParseTrimsTrailingPunctuation(t *testing.T) {
	got := Parse("thanks @ada. and @bello, bye")
	if !reflect.DeepEqual(got.Handles, []string{"ada", "bello"}) {
		t.Errorf("Handles = %v", got.Handles)
	}
}

func TestParseKeepsInteriorDots(t *testing.T) {
	got := Parse("cc @ada.bello here")
	if !reflect.DeepEqual(got.Handles, []string{"ada.bello"}) {
		t.Errorf("Handles = %v, want the interior dot preserved", got.Handles)
	}
}

// Numeric tags are figures, not topics — indexing "#2026" would fill a tag
// feed with unrelated posts that merely mentioned a year.
func TestParseSkipsNumericTags(t *testing.T) {
	got := Parse("see you in #2026 for #cs101")
	if !reflect.DeepEqual(got.Tags, []string{"cs101"}) {
		t.Errorf("Tags = %v, want the pure-numeric tag skipped", got.Tags)
	}
}

func TestParseIgnoresBareTriggers(t *testing.T) {
	got := Parse("@ # @ # done")
	if len(got.Handles) != 0 || len(got.Tags) != 0 {
		t.Errorf("bare triggers produced handles=%v tags=%v", got.Handles, got.Tags)
	}
}

func TestParseIgnoresDoubledTriggers(t *testing.T) {
	got := Parse("@@ada ##tag")
	// The first trigger starts a token whose body begins with the second
	// trigger, which is not an allowed rune — so nothing is extracted.
	if len(got.Handles) != 0 || len(got.Tags) != 0 {
		t.Errorf("doubled triggers produced handles=%v tags=%v", got.Handles, got.Tags)
	}
}

// Mention-spam defence: a post naming a thousand people must not fan out to a
// thousand notifications.
func TestParseCapsMentionsAndTags(t *testing.T) {
	var b strings.Builder
	for i := 0; i < 200; i++ {
		b.WriteString("@user")
		b.WriteString(string(rune('a' + i%26)))
		b.WriteString(string(rune('a' + (i/26)%26)))
		b.WriteString(" #tag")
		b.WriteString(string(rune('a' + i%26)))
		b.WriteString(string(rune('a' + (i/26)%26)))
		b.WriteString(" ")
	}
	got := Parse(b.String())
	if len(got.Handles) > MaxMentionsPerItem {
		t.Errorf("Handles = %d, want at most %d", len(got.Handles), MaxMentionsPerItem)
	}
	if len(got.Tags) > MaxHashtagsPerItem {
		t.Errorf("Tags = %d, want at most %d", len(got.Tags), MaxHashtagsPerItem)
	}
}

func TestParseTruncatesOverlongTokens(t *testing.T) {
	long := strings.Repeat("a", MaxHandleLen+40)
	got := Parse("@" + long)
	if len(got.Handles) != 1 {
		t.Fatalf("Handles = %v", got.Handles)
	}
	if len([]rune(got.Handles[0])) > MaxHandleLen {
		t.Errorf("handle length = %d, want <= %d", len([]rune(got.Handles[0])), MaxHandleLen)
	}
}

// Spans must index the original string correctly or client-side highlighting
// will corrupt the text it renders.
func TestSpansPointAtTheOriginalText(t *testing.T) {
	text := "hi @ada see #cs101 ok"
	runes := []rune(text)
	got := Parse(text)

	if len(got.MentionSpans) != 1 || len(got.TagSpans) != 1 {
		t.Fatalf("spans = %v / %v", got.MentionSpans, got.TagSpans)
	}
	m := got.MentionSpans[0]
	if string(runes[m.Start:m.End]) != "@ada" {
		t.Errorf("mention span covers %q, want %q", string(runes[m.Start:m.End]), "@ada")
	}
	h := got.TagSpans[0]
	if string(runes[h.Start:h.End]) != "#cs101" {
		t.Errorf("tag span covers %q, want %q", string(runes[h.Start:h.End]), "#cs101")
	}
}

// The parser runs on every post; it must never panic on hostile input.
func TestParseNeverPanics(t *testing.T) {
	hostile := []string{
		"", "@", "#", "@@@@", "####",
		string([]byte{0, 1}), // control bytes
		strings.Repeat("@", 5000),
		"@ada bello",
		"ð #emoji",
		strings.Repeat("#a ", 5000),
		strings.Repeat("é", 1000),
	}
	for _, in := range hostile {
		func() {
			defer func() {
				if rec := recover(); rec != nil {
					t.Errorf("Parse(%q) panicked: %v", in, rec)
				}
			}()
			Parse(in)
			NormalizeTag(in)
			NormalizeHandle(in)
			Excerpt(in, 32)
		}()
	}
}

func TestNormalizeTag(t *testing.T) {
	cases := map[string]string{
		"#StudyGroup": "studygroup",
		"studygroup":  "studygroup",
		"  #CS101  ":  "cs101",
		"study group": "studygroup",
		"#2026":       "",
		"":            "",
		"#!!!":        "",
	}
	for in, want := range cases {
		if got := NormalizeTag(in); got != want {
			t.Errorf("NormalizeTag(%q) = %q, want %q", in, got, want)
		}
	}
}

// A tag typed in a URL and the same tag typed in a post must land on one row.
func TestNormalizeTagAgreesWithParse(t *testing.T) {
	parsed := Parse("#StudyGroup").Tags
	if len(parsed) != 1 {
		t.Fatalf("parse produced %v", parsed)
	}
	if got := NormalizeTag("StudyGroup"); got != parsed[0] {
		t.Errorf("NormalizeTag = %q but Parse = %q — tag feeds would split", got, parsed[0])
	}
}

func TestNormalizeHandle(t *testing.T) {
	cases := map[string]string{
		"@Ada":       "ada",
		"ada":        "ada",
		"  @Ada.B  ": "ada.b",
		"@ada!!!":    "ada",
		"":           "",
	}
	for in, want := range cases {
		if got := NormalizeHandle(in); got != want {
			t.Errorf("NormalizeHandle(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestExcerpt(t *testing.T) {
	if got := Excerpt("hello   world\n\nagain", 100); got != "hello world again" {
		t.Errorf("Excerpt collapsed = %q", got)
	}
	got := Excerpt(strings.Repeat("word ", 100), 20)
	if len([]rune(got)) > 21 { // 20 + the ellipsis
		t.Errorf("Excerpt too long: %d runes (%q)", len([]rune(got)), got)
	}
	if !strings.HasSuffix(got, "…") {
		t.Errorf("truncated excerpt should end with an ellipsis, got %q", got)
	}
	if Excerpt("anything", 0) != "" {
		t.Error("Excerpt with maxRunes 0 should be empty")
	}
}

// Excerpt feeds report snapshots and notification bodies; multi-byte input
// must be cut on rune boundaries, never mid-character.
func TestExcerptHandlesMultibyte(t *testing.T) {
	got := Excerpt(strings.Repeat("é", 100), 10)
	if !strings.HasPrefix(got, "é") {
		t.Errorf("multibyte excerpt corrupted: %q", got)
	}
	for _, r := range got {
		if r == '�' {
			t.Fatalf("excerpt contains a replacement char, cut mid-rune: %q", got)
		}
	}
}
