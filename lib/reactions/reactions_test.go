package reactions

import (
	"reflect"
	"testing"
)

func TestNormalizeAcceptsEveryCatalogEntry(t *testing.T) {
	for _, m := range Catalog() {
		if got := Normalize(string(m.Kind)); got != m.Kind {
			t.Errorf("Normalize(%q) = %q, want %q", m.Kind, got, m.Kind)
		}
	}
}

// An unknown reaction becomes a Like rather than an error: a client on an old
// or newer build should still be able to express approval.
func TestNormalizeFallsBackToLike(t *testing.T) {
	for _, raw := range []string{"", "angry", "dislike", "LIKE", "  like  ", "😀"} {
		if got := Normalize(raw); got != Like {
			t.Errorf("Normalize(%q) = %q, want %q", raw, got, Like)
		}
	}
}

// The product decision that there is no public negative reaction is a safety
// property for a student audience, not a styling choice — so it is asserted.
func TestVocabularyHasNoNegativeReaction(t *testing.T) {
	banned := []string{"dislike", "angry", "sad", "downvote", "hate", "cringe"}
	for _, b := range banned {
		if IsValid(b) {
			t.Errorf("%q is a valid reaction; public negative reactions are a bullying vector", b)
		}
	}
}

func TestIsValid(t *testing.T) {
	if !IsValid("celebrate") {
		t.Error("celebrate should be valid")
	}
	if IsValid("nonsense") {
		t.Error("nonsense should not be valid")
	}
}

func TestCatalogIsCompleteAndOrdered(t *testing.T) {
	cat := Catalog()
	if len(cat) != len(Ordered) {
		t.Fatalf("Catalog has %d entries, Ordered has %d", len(cat), len(Ordered))
	}
	for i, m := range cat {
		if m.Kind != Ordered[i] {
			t.Errorf("Catalog[%d] = %q, want %q", i, m.Kind, Ordered[i])
		}
		if m.Label == "" {
			t.Errorf("%q has no label", m.Kind)
		}
		if m.Emoji == "" {
			t.Errorf("%q has no emoji", m.Kind)
		}
	}
}

// Every valid kind must have metadata, or a client renders a blank chip.
func TestEveryValidKindHasMeta(t *testing.T) {
	for k := range valid {
		if _, ok := metaByKind[k]; !ok {
			t.Errorf("kind %q has no Meta entry", k)
		}
	}
}

func TestTopKindsPicksHighestThree(t *testing.T) {
	got := topKinds(map[Kind]int{
		Like: 3, Love: 10, Celebrate: 7, Insightful: 1, Support: 5,
	})
	want := []Kind{Love, Celebrate, Support}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("topKinds = %v, want %v", got, want)
	}
}

// A tie must resolve the same way on every request, or the facepile visibly
// reshuffles each time the feed re-renders.
func TestTopKindsIsDeterministicOnTies(t *testing.T) {
	counts := map[Kind]int{Like: 5, Love: 5, Celebrate: 5, Support: 5}
	first := topKinds(counts)
	for i := 0; i < 50; i++ {
		if got := topKinds(counts); !reflect.DeepEqual(got, first) {
			t.Fatalf("topKinds unstable across calls: %v then %v", first, got)
		}
	}
	// Ties resolve in canonical display order.
	if !reflect.DeepEqual(first, []Kind{Like, Love, Celebrate}) {
		t.Errorf("tie order = %v, want canonical order", first)
	}
}

func TestTopKindsIgnoresZerosAndEmpties(t *testing.T) {
	if got := topKinds(map[Kind]int{Like: 0, Love: 0}); len(got) != 0 {
		t.Errorf("topKinds with only zeros = %v, want empty", got)
	}
	if got := topKinds(map[Kind]int{}); len(got) != 0 {
		t.Errorf("topKinds of empty = %v, want empty", got)
	}
	if got := topKinds(nil); len(got) != 0 {
		t.Errorf("topKinds(nil) = %v, want empty", got)
	}
}

func TestTopKindsCapsAtThree(t *testing.T) {
	counts := map[Kind]int{}
	for i, k := range Ordered {
		counts[k] = 100 - i
	}
	if got := topKinds(counts); len(got) != 3 {
		t.Errorf("topKinds returned %d entries, want 3", len(got))
	}
}

func TestValidSubjects(t *testing.T) {
	for _, s := range []string{SubjectPost, SubjectComment, SubjectStory} {
		if !validSubjects[s] {
			t.Errorf("%q should be a valid subject", s)
		}
	}
	for _, s := range []string{"", "user", "group", "message"} {
		if validSubjects[s] {
			t.Errorf("%q should not be a reactable subject", s)
		}
	}
}
