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

    await fetch(`${API}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            pizzeria: pizzeria.value,
            reviewer: reviewer.value,
            score: +score.value,
            comment: comment.value
        })
    });

    e.target.reset();
    loadPizzerias();
};

loadPizzerias();
