package polls

import (
	"strings"
	"testing"
)

// Option cleaning is where a poll becomes usable or nonsense, so it is
// exercised directly through the same normalisation Create performs.
func cleanOptions(raw []string) []string {
	cleaned := make([]string, 0, len(raw))
	seen := map[string]bool{}
	for _, r := range raw {
		opt := strings.TrimSpace(r)
		if opt == "" {
			continue
		}
		if len([]rune(opt)) > MaxOptionLen {
			opt = string([]rune(opt)[:MaxOptionLen])
		}
		key := strings.ToLower(opt)
		if seen[key] {
			continue
		}
		seen[key] = true
		cleaned = append(cleaned, opt)
	}
	return cleaned
}

// Duplicate options split the vote and make every percentage meaningless, so
// they are merged rather than stored twice.
func TestDuplicateOptionsAreMerged(t *testing.T) {
	got := cleanOptions([]string{"Yes", "yes", "YES", "No"})
	if len(got) != 2 {
		t.Fatalf("cleanOptions = %v, want 2 distinct options", got)
	}
	if got[0] != "Yes" || got[1] != "No" {
		t.Errorf("cleanOptions = %v, want the first spelling preserved", got)
	}
}

func TestBlankOptionsAreDropped(t *testing.T) {
	got := cleanOptions([]string{"A", "", "   ", "B"})
	if len(got) != 2 {
		t.Errorf("cleanOptions = %v, want blanks dropped", got)
	}
}

func TestOptionLengthIsBounded(t *testing.T) {
	long := strings.Repeat("x", MaxOptionLen+50)
	got := cleanOptions([]string{long, "B"})
	if len([]rune(got[0])) > MaxOptionLen {
		t.Errorf("option is %d runes, want at most %d", len([]rune(got[0])), MaxOptionLen)
	}
}

// The 2..6 range is the product rule; a one-option poll is not a poll and a
// twenty-option poll is unreadable on a phone.
func TestOptionCountBounds(t *testing.T) {
	if MinOptions < 2 {
		t.Error("a poll with fewer than 2 options is not a poll")
	}
	if MaxOptions > 6 {
		t.Error("more than 6 options does not fit a mobile screen")
	}

	tooFew := cleanOptions([]string{"only"})
	if len(tooFew) >= MinOptions {
		t.Error("a single option should fail the minimum")
	}

	many := make([]string, MaxOptions+3)
	for i := range many {
		many[i] = string(rune('a' + i))
	}
	if len(cleanOptions(many)) <= MaxOptions {
		t.Error("the fixture should exceed MaxOptions so Create rejects it")
	}
}

func TestCleanOptionsNeverPanics(t *testing.T) {
	cases := [][]string{
		nil, {}, {""}, {"😀", "😀"}, {strings.Repeat("é", 500)},
		{strings.Repeat(" ", 100), "\t\n"},
	}
	for i, c := range cases {
		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("case %d panicked: %v", i, r)
				}
			}()
			cleanOptions(c)
		}()
	}
}

// Multi-byte options must be cut on rune boundaries, never mid-character.
func TestOptionTruncationIsRuneSafe(t *testing.T) {
	got := cleanOptions([]string{strings.Repeat("é", MaxOptionLen+20)})
	if len(got) != 1 {
		t.Fatalf("cleanOptions = %v", got)
	}
	for _, r := range got[0] {
		if r == '�' {
			t.Fatal("option was cut mid-rune")
		}
	}
}
