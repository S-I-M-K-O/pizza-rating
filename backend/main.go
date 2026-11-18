package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"unicode"
	"unicode/utf8"
)

const (
	minScore        = 1
	maxScore        = 6
	maxNameLen      = 80
	maxReviewerLen  = 40
	maxCommentLen   = 500
	maxRequestBytes = 8 << 10
)

type Rating struct {
	Reviewer string `json:"reviewer"`
	Score    int    `json:"score"`
	Comment  string `json:"comment"`
}

type Pizzeria struct {
	Name    string   `json:"name"`
	Ratings []Rating `json:"ratings"`
	Average float64  `json:"average"`
}

type ratingInput struct {
	Pizzeria string `json:"pizzeria"`
	Reviewer string `json:"reviewer"`
	Score    int    `json:"score"`
	Comment  string `json:"comment"`
}

// Store holds all pizzerias in memory and persists them to a JSON file.
// All access goes through the mutex because net/http serves requests concurrently.
type Store struct {
	mu        sync.RWMutex
	path      string
	pizzerias []Pizzeria
}

// NewStore loads the data file. A missing file starts an empty store; an unreadable
// or malformed file is an error, so we never overwrite existing data with an empty list.
func NewStore(path string) (*Store, error) {
	s := &Store{path: path, pizzerias: []Pizzeria{}}
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	if len(strings.TrimSpace(string(data))) == 0 {
		return s, nil
	}
	if err := json.Unmarshal(data, &s.pizzerias); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	if s.pizzerias == nil {
		s.pizzerias = []Pizzeria{}
	}
	for i := range s.pizzerias {
		s.pizzerias[i].Average = average(s.pizzerias[i].Ratings)
	}
	return s, nil
}

// List returns a copy of all pizzerias, safe to use without holding the lock.
func (s *Store) List() []Pizzeria {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Pizzeria, len(s.pizzerias))
	for i, p := range s.pizzerias {
		p.Ratings = append([]Rating(nil), p.Ratings...)
		out[i] = p
	}
	return out
}

// AddRating appends a rating, creating the pizzeria if needed. The in-memory state
// only changes after the file was written successfully.
func (s *Store) AddRating(in ratingInput) (created bool, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rating := Rating{Reviewer: in.Reviewer, Score: in.Score, Comment: in.Comment}
	next := make([]Pizzeria, len(s.pizzerias))
	copy(next, s.pizzerias)

	key := normalizeName(in.Pizzeria)
	idx := -1
	for i := range next {
		if normalizeName(next[i].Name) == key {
			idx = i
			break
		}
	}
	if idx == -1 {
		next = append(next, Pizzeria{Name: formatName(in.Pizzeria)})
		idx = len(next) - 1
		created = true
	}
	p := next[idx]
	p.Ratings = append(append([]Rating(nil), p.Ratings...), rating)
	p.Average = average(p.Ratings)
	next[idx] = p

	if err := writeJSONAtomic(s.path, next); err != nil {
		return false, err
	}
	s.pizzerias = next
	return created, nil
}

func average(rs []Rating) float64 {
	if len(rs) == 0 {
		return 0
	}
	sum := 0
	for _, r := range rs {
		sum += r.Score
	}
	return float64(sum) / float64(len(rs))
}

// writeJSONAtomic writes to a temp file in the same directory and renames it over
// the target, so a crash mid-write can never leave a truncated data file behind.
func writeJSONAtomic(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, ".data-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op after a successful rename

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tmpName, 0o644); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

// normalizeName is the comparison key: case-insensitive, whitespace collapsed.
func normalizeName(name string) string {
	return strings.ToLower(strings.Join(strings.Fields(name), " "))
}

// formatName collapses whitespace and capitalizes the first letter of each word,
// leaving the rest as typed (so "pizza d'oro" becomes "Pizza D'oro", "da GIGI" keeps "GIGI").
func formatName(name string) string {
	words := strings.Fields(name)
	for i, w := range words {
		r, size := utf8.DecodeRuneInString(w)
		words[i] = string(unicode.ToUpper(r)) + w[size:]
	}
	return strings.Join(words, " ")
}

func cleanText(s string) string {
	return strings.TrimSpace(s)
}

func validate(in *ratingInput) error {
	in.Pizzeria = strings.Join(strings.Fields(in.Pizzeria), " ")
	in.Reviewer = strings.Join(strings.Fields(in.Reviewer), " ")
	in.Comment = cleanText(in.Comment)

	switch {
	case in.Pizzeria == "":
		return errors.New("Pizzeria name is required")
	case utf8.RuneCountInString(in.Pizzeria) > maxNameLen:
		return fmt.Errorf("Pizzeria name must be at most %d characters", maxNameLen)
	case in.Reviewer == "":
		return errors.New("Your name is required")
	case utf8.RuneCountInString(in.Reviewer) > maxReviewerLen:
		return fmt.Errorf("Your name must be at most %d characters", maxReviewerLen)
	case in.Score < minScore || in.Score > maxScore:
		return fmt.Errorf("Score must be between %d and %d", minScore, maxScore)
	case utf8.RuneCountInString(in.Comment) > maxCommentLen:
		return fmt.Errorf("Comment must be at most %d characters", maxCommentLen)
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Store) handleList(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.List())
}

func (s *Store) handleRate(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	var in ratingInput
	if err := dec.Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := validate(&in); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := s.AddRating(in)
	if err != nil {
		log.Printf("save rating: %v", err)
		writeError(w, http.StatusInternalServerError, "Could not save the rating")
		return
	}
	if created {
		writeJSON(w, http.StatusCreated, map[string]string{"status": "pizzeria created"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rating added"})
}

// withCORS sets CORS headers and answers preflight requests without reaching the handlers.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func newHandler(s *Store) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/pizzerias", s.handleList)
	mux.HandleFunc("POST /api/rating", s.handleRate)
	return withCORS(mux)
}

func main() {
	path := os.Getenv("DATA_FILE")
	if path == "" {
		path = "data/data.json"
	}
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	store, err := NewStore(path)
	if err != nil {
		log.Fatalf("refusing to start, data file is unusable (fix or move it): %v", err)
	}

	log.Printf("Backend running on %s (data: %s)", addr, path)
	log.Fatal(http.ListenAndServe(addr, newHandler(store)))
}
