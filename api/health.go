package handler

import (
	"net/http"

	"nile-connect/lib/mw"
	"nile-connect/lib/respond"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	if mw.HandlePreflight(w, r) {
		return
	}
	respond.OK(w, map[string]string{"status": "ok", "version": "2.0.0"})
}
