package respond

import (
	"encoding/json"
	"net/http"
)

func JSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func OK(w http.ResponseWriter, body any) {
	JSON(w, http.StatusOK, map[string]any{"data": body})
}

func Created(w http.ResponseWriter, body any) {
	JSON(w, http.StatusCreated, map[string]any{"data": body})
}

func Error(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, map[string]string{"error": msg})
}
