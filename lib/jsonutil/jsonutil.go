// Package jsonutil holds small helpers for the JSON-encoded-string-array
// columns used throughout the schema (Job.RequiredDocs, Application.DocumentIDs,
// etc.) — plain TEXT columns that store a JSON array as a string.
package jsonutil

import "encoding/json"

// StringSlice decodes a JSON-array-encoded string column into a []string.
// Always returns a non-nil slice: empty/blank input, malformed JSON, or a
// zero-value column (all realistic states for these TEXT columns) yield []
// rather than a nil slice. A nil slice marshals to JSON `null`, which crashes
// frontend code that spreads or iterates the field unconditionally — this
// guarantees callers always get a safely iterable value.
func StringSlice(raw string) []string {
	out := []string{}
	if raw == "" {
		return out
	}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []string{}
	}
	if out == nil {
		return []string{}
	}
	return out
}
