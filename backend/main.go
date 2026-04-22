package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "strings"
)

type Rating struct {
    Reviewer string `json:"reviewer"`
    Score    int    `json:"score"`
    Comment  string `json:"comment"`
}

type Pizzeria struct {
    Name        string   `json:"name"`
    Ratings     []Rating `json:"ratings"`
    Average     float64  `json:"average"`
}

var (
    pizzerias []Pizzeria
    dataFile  = "data.json"
)

func normalizePizzeriaName(name string) string {
    return strings.ToLower(strings.TrimSpace(name))
}

func formatPizzeriaName(name string) string {
    return strings.Title(strings.ToLower(strings.TrimSpace(name)))
}

func loadData() {
    file, err := os.Open(dataFile)
    if err != nil {
        pizzerias = []Pizzeria{}
        return
    }
    defer file.Close()
    json.NewDecoder(file).Decode(&pizzerias)
}

func saveData() {
    for i := range pizzerias {
        sum := 0
        for _, r := range pizzerias[i].Ratings {
            sum += r.Score
        }
        pizzerias[i].Average = float64(sum) / float64(len(pizzerias[i].Ratings))
    }

    file, _ := os.Create(dataFile)
    defer file.Close()
    json.NewEncoder(file).Encode(pizzerias)
}

func getPizzerias(w http.ResponseWriter, r *http.Request) {
    enableCORS(w, r)
    if err := json.NewEncoder(w).Encode(pizzerias); err != nil {
        log.Printf("Error encoding pizzerias: %v", err)
    }
}

func postRating(w http.ResponseWriter, r *http.Request) {
    enableCORS(w, r)

    var input struct {
        Pizzeria string `json:"pizzeria"`
        Reviewer string `json:"reviewer"`
        Score    int    `json:"score"`
        Comment  string `json:"comment"`
    }

    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        log.Printf("Error decoding input: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid input"})
        return
    }

    // Normalize the input pizzeria name for comparison
    normalizedInputName := normalizePizzeriaName(input.Pizzeria)

    for i := range pizzerias {
        if normalizePizzeriaName(pizzerias[i].Name) == normalizedInputName {
            pizzerias[i].Ratings = append(pizzerias[i].Ratings, Rating{
                Reviewer: input.Reviewer,
                Score:    input.Score,
                Comment:  input.Comment,
            })
            saveData()
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]string{"status": "rating added"})
            return
        }
    }

    // Create new pizzeria with properly formatted name
    pizzerias = append(pizzerias, Pizzeria{
        Name: formatPizzeriaName(input.Pizzeria),
        Ratings: []Rating{{
            Reviewer: input.Reviewer,
            Score:    input.Score,
            Comment:  input.Comment,
        }},
    })

    saveData()
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"status": "pizzeria created"})
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    w.Header().Set("Content-Type", "application/json")
    
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }
}

func main() {
    loadData()

    http.HandleFunc("/api/pizzerias", getPizzerias)
    http.HandleFunc("/api/rating", postRating)

    log.Println("Backend running on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
