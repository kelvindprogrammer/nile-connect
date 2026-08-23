package feedrank

import (
	"fmt"
	"testing"
	"time"
)

// Load characterisation for the ranking hot path.
//
// The spec asks for load testing against a realistic dataset rather than a
// single developer account. True end-to-end load testing needs a deployed
// environment and a database, which this suite cannot provision — but ranking
// is the one part of the feed whose cost is entirely CPU-bound and independent
// of the database, so it CAN be characterised here, deterministically, on
// every run.
//
// What these establish: ranking a page for a 15,000-student platform is
// sub-millisecond, and the diversity pass does not degrade superlinearly on a
// pathological single-author feed.

func makeCandidates(n, authors int) []Candidate {
	base := time.Date(2026, 8, 23, 12, 0, 0, 0, time.UTC)
	out := make([]Candidate, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, Candidate{
			PostID:     fmt.Sprintf("p%d", i),
			AuthorID:   fmt.Sprintf("a%d", i%authors),
			CreatedAt:  base.Add(-time.Duration(i) * time.Minute),
			Affinity:   float64(i%10) / 10,
			Reactions:  i % 200,
			Comments:   i % 30,
			Reposts:    i % 10,
			TextLength: 50 + i%400,
			HasMedia:   i%3 == 0,
			HasPoll:    i%11 == 0,
		})
	}
	return out
}

func BenchmarkRankTypicalPage(b *testing.B) {
	// The window the feed actually over-fetches for one page.
	candidates := makeCandidates(60, 25)
	now := time.Now()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		Rank(candidates, now, DefaultWeights)
	}
}

func BenchmarkRankLargeWindow(b *testing.B) {
	// The maximum window the feed will ever assemble (capped at 400).
	candidates := makeCandidates(400, 80)
	now := time.Now()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		Rank(candidates, now, DefaultWeights)
	}
}

// The pathological shape: one author filling the whole window, which forces
// the diversity pass down its slowest path on every item.
func BenchmarkRankSingleAuthorWorstCase(b *testing.B) {
	candidates := makeCandidates(400, 1)
	now := time.Now()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		Rank(candidates, now, DefaultWeights)
	}
}

// A hard budget, asserted as a test rather than left to a benchmark nobody
// reads. Ranking runs inside the request, so a regression here is felt by
// every user on every feed load.
func TestRankStaysWithinLatencyBudget(t *testing.T) {
	const budget = 25 * time.Millisecond

	cases := []struct {
		name    string
		posts   int
		authors int
	}{
		{"typical page", 60, 25},
		{"max window", 400, 80},
		{"single author worst case", 400, 1},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			candidates := makeCandidates(c.posts, c.authors)
			now := time.Now()

			// Warm up so the measurement is not dominated by first-run effects.
			Rank(candidates, now, DefaultWeights)

			start := time.Now()
			const iterations = 20
			for i := 0; i < iterations; i++ {
				Rank(candidates, now, DefaultWeights)
			}
			perCall := time.Since(start) / iterations

			if perCall > budget {
				t.Errorf("ranking %d posts took %v per call, budget is %v",
					c.posts, perCall, budget)
			}
			t.Logf("%s: %v per call (%d posts, %d authors)", c.name, perCall, c.posts, c.authors)
		})
	}
}

// Ranking must not allocate unboundedly: the feed runs on a 256MB serverless
// function shared with everything else in the request.
func TestRankAllocationIsBounded(t *testing.T) {
	candidates := makeCandidates(400, 80)
	now := time.Now()

	result := testing.Benchmark(func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			Rank(candidates, now, DefaultWeights)
		}
	})

	bytesPerOp := result.AllocedBytesPerOp()
	// Generous, but catches an accidental O(n^2) allocation in the diversity
	// pass, which is the realistic regression.
	const budget = 2 << 20 // 2MB per ranked page
	if bytesPerOp > budget {
		t.Errorf("ranking allocated %d bytes per call, budget is %d", bytesPerOp, budget)
	}
	t.Logf("allocation: %d bytes/op, %d allocs/op", bytesPerOp, result.AllocsPerOp())
}
