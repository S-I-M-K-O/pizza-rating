const API = "http://localhost:8080/api";

async function loadPizzerias() {
    const res = await fetch(`${API}/pizzerias`);
    const data = await res.json();

    const list = document.getElementById("list");
    list.innerHTML = "";

    data.forEach(p => {
        const div = document.createElement("div");
        div.className = "pizzeria";
        div.innerHTML = `
            <h2>${p.name} ⭐ ${p.average.toFixed(1)}</h2>
            ${p.ratings.map(r =>
                `<p><b>${r.reviewer}</b> (${r.score})<br>${r.comment}</p>`
            ).join("")}
        `;
        list.appendChild(div);
    });
}

document.getElementById("ratingForm").onsubmit = async e => {
    e.preventDefault();

    const pizzeriaInput = document.getElementById("pizzeria");
    const reviewerInput = document.getElementById("reviewer");
    const scoreInput = document.getElementById("score");
    const commentInput = document.getElementById("comment");

    const res = await fetch(`${API}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            pizzeria: pizzeriaInput.value,
            reviewer: reviewerInput.value,
            score: +scoreInput.value,
            comment: commentInput.value
        })
    });

    if (res.ok) {
        e.target.reset();
        loadPizzerias();
    } else {
        alert("Error submitting rating");
    }
};

loadPizzerias();
