package ratelimit

import (
	"testing"
	"time"
)

// Every action with a Rule must have a Counter, or the rule is decorative:
// Check would silently allow everything.
func TestEveryRuleHasACounter(t *testing.T) {
	for action := range Rules {
		if _, ok := counters[action]; !ok {
			t.Errorf("action %q has a Rule but no Counter — the limit is never enforced", action)
		}
	}
}

// And every counter should correspond to a declared rule, or it is dead code.
func TestEveryCounterHasARule(t *testing.T) {
	for action := range counters {
		if _, ok := Rules[action]; !ok {
			t.Errorf("action %q has a Counter but no Rule", action)
		}
	}
}

func TestRulesAreSane(t *testing.T) {
	for action, rule := range Rules {
		if rule.Max <= 0 {
			t.Errorf("%q: Max = %d, must be positive", action, rule.Max)
		}
		if rule.Window <= 0 {
			t.Errorf("%q: Window = %v, must be positive", action, rule.Window)
		}
		if rule.Message == "" {
			t.Errorf("%q: no user-facing message", action)
		}
		// A limit a real person hits during normal use is a bug, not a
		// safeguard. These floors encode "an enthusiastic student is fine".
		if rule.Window <= time.Hour && rule.Max < 10 {
			t.Errorf("%q: %d per %v is too tight for legitimate use", action, rule.Max, rule.Window)
		}
	}
}

// Counter definitions are interpolated into SQL, so they must never contain
// anything that could alter the statement's shape.
func TestCounterColumnsAreStaticIdentifiers(t *testing.T) {
	safe := func(s string) bool {
		for _, r := range s {
			if !(r >= 'a' && r <= 'z') && r != '_' {
				return false
			}
		}
		return s != ""
	}
	for action, c := range counters {
		if !safe(c.Table) {
			t.Errorf("%q: table %q is not a plain identifier", action, c.Table)
		}
		if !safe(c.ActorCol) {
			t.Errorf("%q: actor column %q is not a plain identifier", action, c.ActorCol)
		}
		if !safe(c.TimeCol) {
			t.Errorf("%q: time column %q is not a plain identifier", action, c.TimeCol)
		}
	}
}

// An unknown action must not accidentally deny — handlers call Check for
// actions that may not have rules yet.
func TestUnknownActionIsAllowed(t *testing.T) {
	d := Check(nil, "u1", Action("does_not_exist"))
	if !d.Allowed {
		t.Error("an unknown action was denied")
	}
}

func TestEmptyUserIsAllowed(t *testing.T) {
	if !Check(nil, "", ActionPost).Allowed {
		t.Error("an empty user id was denied rather than ignored")
	}
}

func TestRetryAfterSeconds(t *testing.T) {
	if got := (Decision{Allowed: true}).RetryAfterSeconds(); got != 0 {
		t.Errorf("an allowed decision reported RetryAfter %d", got)
	}
	// Always rounds up, so a client never retries fractionally too early.
	d := Decision{Allowed: false, RetryAfter: 1500 * time.Millisecond}
	if got := d.RetryAfterSeconds(); got != 2 {
		t.Errorf("RetryAfterSeconds = %d, want 2 (rounded up)", got)
	}
	// A sub-second wait still reports at least one second.
	d2 := Decision{Allowed: false, RetryAfter: 10 * time.Millisecond}
	if got := d2.RetryAfterSeconds(); got != 1 {
		t.Errorf("RetryAfterSeconds = %d, want a 1s floor", got)
	}
}

func TestDecisionError(t *testing.T) {
	if (Decision{Allowed: true}).Error() != nil {
		t.Error("an allowed decision produced an error")
	}
	err := Decision{Allowed: false, Message: "slow down"}.Error()
	if err == nil || err.Error() != "slow down" {
		t.Errorf("Error() = %v, want the rule message", err)
	}
}
