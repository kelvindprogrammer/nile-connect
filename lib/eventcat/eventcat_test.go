package eventcat

import "testing"

// TestNormalizeUnifiesProducerVocabularies is the regression test for the QA
// finding "Event Category Tabs Appear Empty". Staff wrote "Career Fair",
// employers wrote "career_fair", and the student page filtered on "FAIR" —
// three spellings of one category that never compared equal. Every spelling
// must now collapse onto the same canonical slug.
func TestNormalizeUnifiesProducerVocabularies(t *testing.T) {
	groups := map[string][]string{
		CareerFair:   {"Career Fair", "career_fair", "FAIR", "careerFair", "Job Fair", "  career fair  "},
		Workshop:     {"Workshop", "workshop", "WORKSHOP", "workshops", "Training"},
		Networking:   {"Networking", "networking", "NETWORKING", "network", "Mixer"},
		Webinar:      {"Webinar", "webinar", "WEBINAR", "Online"},
		Seminar:      {"Seminar", "seminar", "SEMINAR", "Lecture", "Conference"},
		InfoSession:  {"Info Session", "info_session", "InfoSession", "Open Day"},
		AlumniMeetup: {"Alumni Meetup", "alumni_meetup", "alumni", "Meetup"},
		Hackathon:    {"Hackathon", "hackathon", "HACKATHON", "hack"},
		TechTalk:     {"TECH", "Tech Talk", "tech_talk", "techtalk"},
	}
	for want, spellings := range groups {
		for _, in := range spellings {
			if got := Normalize(in); got != want {
				t.Errorf("Normalize(%q) = %q, want %q", in, got, want)
			}
		}
	}
}

// TestNormalizeNeverDropsAnEvent guarantees the filter cannot silently hide a
// row: anything unrecognised lands in "other" rather than in a slug that no
// tab renders.
func TestNormalizeNeverDropsAnEvent(t *testing.T) {
	for _, in := range []string{"", "   ", "???", "Something Nobody Planned", "!!!"} {
		got := Normalize(in)
		if !IsCanonical(got) {
			t.Errorf("Normalize(%q) = %q, which is not a canonical slug", in, got)
		}
		if got != Other {
			t.Errorf("Normalize(%q) = %q, want %q", in, got, Other)
		}
	}
}

// TestNormalizeIsIdempotent matters because db.normalizeEventCategories runs on
// every cold start; a second pass must not rewrite what the first pass wrote.
func TestNormalizeIsIdempotent(t *testing.T) {
	for _, slug := range Canonical() {
		if got := Normalize(slug); got != slug {
			t.Errorf("Normalize(%q) = %q, want it unchanged", slug, got)
		}
		if got := Normalize(Normalize(slug)); got != slug {
			t.Errorf("double Normalize(%q) = %q, want %q", slug, got, slug)
		}
	}
}

// TestEveryCanonicalSlugHasALabel keeps the API's category_label field from
// falling back to "Other" for a real category.
func TestEveryCanonicalSlugHasALabel(t *testing.T) {
	for _, slug := range Canonical() {
		if Label(slug) == "" {
			t.Errorf("Label(%q) is empty", slug)
		}
		if slug != Other && Label(slug) == Label(Other) {
			t.Errorf("Label(%q) fell through to the Other label", slug)
		}
	}
}

// TestAliasesResolveToCanonical catches a typo'd alias target, which would
// otherwise reintroduce the original bug for one category only.
func TestAliasesResolveToCanonical(t *testing.T) {
	for alias, target := range aliases {
		if !IsCanonical(target) {
			t.Errorf("alias %q maps to %q, which is not canonical", alias, target)
		}
	}
}
