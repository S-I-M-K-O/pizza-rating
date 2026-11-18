package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func newTestServer(t *testing.T) (*Store, http.Handler) {
	t.Helper()
	s, err := NewStore(filepath.Join(t.TempDir(), "data.json"))
	if err != nil {
		t.Fatal(err)
	}
	return s, newHandler(s)
}

func do(h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestValidation(t *testing.T) {
	_, h := newTestServer(t)
	cases := map[string]string{
		"score too high": `{"pizzeria":"Uno","reviewer":"A","score":999}`,
		"score too low":  `{"pizzeria":"Uno","reviewer":"A","score":-5}`,
		"empty name":     `{"pizzeria":"   ","reviewer":"A","score":3}`,
		"empty reviewer": `{"pizzeria":"Uno","reviewer":"","score":3}`,
		"long comment":   `{"pizzeria":"Uno","reviewer":"A","score":3,"comment":"` + strings.Repeat("x", 501) + `"}`,
		"bad json":       `{`,
	}
	for name, body := range cases {
		if rec := do(h, "POST", "/api/rating", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", name, rec.Code)
		}
	}
}

func TestMethodsAndPreflight(t *testing.T) {
	_, h := newTestServer(t)
	if rec := do(h, "GET", "/api/rating", ""); rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/rating: got %d, want 405", rec.Code)
	}
	if rec := do(h, "OPTIONS", "/api/rating", ""); rec.Code != http.StatusNoContent {
		t.Errorf("OPTIONS: got %d, want 204", rec.Code)
	}
}

func TestAddAndMergeNames(t *testing.T) {
	s, h := newTestServer(t)
	if rec := do(h, "POST", "/api/rating", `{"pizzeria":"  pizza   d'oro ","reviewer":"A","score":4}`); rec.Code != http.StatusCreated {
		t.Fatalf("create: got %d %s", rec.Code, rec.Body)
	}
	if rec := do(h, "POST", "/api/rating", `{"pizzeria":"PIZZA D'ORO","reviewer":"B","score":6}`); rec.Code != http.StatusOK {
		t.Fatalf("add: got %d %s", rec.Code, rec.Body)
	}
	list := s.List()
	if len(list) != 1 || list[0].Name != "Pizza D'oro" || list[0].Average != 5 {
		t.Fatalf("unexpected state: %+v", list)
	}

	// Data survives a reload.
	reloaded, err := NewStore(s.path)
	if err != nil {
		t.Fatal(err)
	}
	if got := reloaded.List(); len(got) != 1 || len(got[0].Ratings) != 2 {
		t.Fatalf("reload: %+v", got)
	}
}

func TestConcurrentWrites(t *testing.T) {
	s, h := newTestServer(t)
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			do(h, "POST", "/api/rating", `{"pizzeria":"Uno","reviewer":"A","score":3}`)
		}()
	}
	wg.Wait()
	if got := len(s.List()[0].Ratings); got != 50 {
		t.Fatalf("got %d ratings, want 50", got)
	}
}

func TestCorruptFileRefusesToLoad(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	if err := os.WriteFile(path, []byte("[{broken"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := NewStore(path); err == nil {
		t.Fatal("expected an error for a corrupt data file")
	}
}
