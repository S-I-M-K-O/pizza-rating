package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
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
    enableCORS(w)
    json.NewEncoder(w).Encode(pizzerias)
}

func postRating(w http.ResponseWriter, r *http.Request) {
    enableCORS(w)

    var input struct {
        Pizzeria string `json:"pizzeria"`
        Reviewer string `json:"reviewer"`
        Score    int    `json:"score"`
        Comment  string `json:"comment"`
    }

    json.NewDecoder(r.Body).Decode(&input)

    for i := range pizzerias {
        if pizzerias[i].Name == input.Pizzeria {
            pizzerias[i].Ratings = append(pizzerias[i].Ratings, Rating{
                Reviewer: input.Reviewer,
                Score:    input.Score,
                Comment:  input.Comment,
            })
            saveData()
            return
        }
    }

    pizzerias = append(pizzerias, Pizzeria{
        Name: input.Pizzeria,
        Ratings: []Rating{{
            Reviewer: input.Reviewer,
            Score:    input.Score,
            Comment:  input.Comment,
        }},
    })

    saveData()
}

func enableCORS(w http.ResponseWriter) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Content-Type", "application/json")
}

func main() {
    loadData()

    http.HandleFunc("/api/pizzerias", getPizzerias)
    http.HandleFunc("/api/rating", postRating)

    log.Println("Backend running on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
