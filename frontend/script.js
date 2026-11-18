"use strict";

const API = "/api";
const MAX_SCORE = 6;
const TOP_COUNT = 5;
const REVIEWER_KEY = "pizza-rating:reviewer";
const THEME_KEY = "pizza-rating:theme";

/* ---------- themes: everything that changes besides CSS lives here ---------- */

const THEMES = {
    pizzabox: {
        themeColor: "#d9b88c",
        icon: "icon-slice",
        romanRanks: false,
        copy: {
            stamp1: "Fresh", stamp2: "&", stamp3: "Hot",
            boardTitle: "Leaderboard",
            rateTitle: "Rate a pizzeria",
            submit: "Add rating",
            submitting: "Adding…",
            commentPlaceholder: "Crust, sauce, toppings, price…",
            showTop: "Show top 5 only",
            scoreHint: "6 is best",
        },
        scoreWords: { 1: "Never again", 2: "Bad", 3: "Okay", 4: "Good", 5: "Very good", 6: "Perfect" },
    },
    tavern: {
        themeColor: "#2b1d13",
        icon: "icon-d20",
        romanRanks: true,
        copy: {
            stamp1: "Roll", stamp2: "for", stamp3: "Pizza",
            boardTitle: "Hall of Legends",
            rateTitle: "Record your quest",
            submit: "Inscribe rating",
            submitting: "Inscribing…",
            commentPlaceholder: "Tell the bards of crust, sauce and toppings…",
            showTop: "Show the top 5 only",
            scoreHint: "6 is legendary",
        },
        scoreWords: { 1: "Critical fail", 2: "Cursed", 3: "Mundane", 4: "Worthy", 5: "Enchanted", 6: "Legendary" },
    },
    neon: {
        themeColor: "#120d26",
        icon: "icon-slice",
        romanRanks: false,
        copy: {
            stamp1: "Open", stamp2: "till", stamp3: "late",
            boardTitle: "Tonight's top slices",
            rateTitle: "Drop a rating",
            submit: "Add rating",
            submitting: "Adding…",
            commentPlaceholder: "Crust, sauce, toppings, price…",
            showTop: "Show top 5 only",
            scoreHint: "6 is best",
        },
        scoreWords: { 1: "Never again", 2: "Bad", 3: "Okay", 4: "Good", 5: "Very good", 6: "Perfect" },
    },
};

let currentTheme = THEMES[document.documentElement.dataset.theme] ? document.documentElement.dataset.theme : "pizzabox";
const theme = () => THEMES[currentTheme];

const els = {
    list: document.getElementById("list"),
    summary: document.getElementById("summary"),
    names: document.getElementById("pizzeria-names"),
    form: document.getElementById("ratingForm"),
    pizzeria: document.getElementById("pizzeria"),
    reviewer: document.getElementById("reviewer"),
    comment: document.getElementById("comment"),
    commentCount: document.getElementById("comment-count"),
    picker: document.getElementById("score-picker"),
    scoreWord: document.getElementById("score-word"),
    message: document.getElementById("message"),
    submit: document.querySelector("#ratingForm .submit"),
    showMore: document.getElementById("show-more"),
    themeColor: document.querySelector('meta[name="theme-color"]'),
};

let openPizzerias = new Set();
let showAll = false;
let lastData = null;
let submitting = false;

/* ---------- small DOM helper: all user content goes through textContent ---------- */

function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === "class") el.className = value;
        else if (key === "text") el.textContent = value;
        else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value);
    }
    for (const child of children) {
        if (child == null) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
}

function scoreIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 28");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#${theme().icon}`);
    use.dataset.scoreIcon = "";
    svg.append(use);
    return svg;
}

/** Six icons, filled proportionally to the score. */
function scoreMeter(score) {
    const row = () => h("span", { class: "meter-row" }, ...Array.from({ length: MAX_SCORE }, scoreIcon));
    const fill = row();
    fill.classList.add("meter-fill");
    const meter = h("span", { class: "meter", role: "img", "aria-label": `${formatScore(score)} out of ${MAX_SCORE}` }, row(), fill);
    meter.style.setProperty("--fill", `${(score / MAX_SCORE) * 100}%`);
    return meter;
}

function formatScore(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function toRoman(n) {
    const map = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    if (n >= 40) return String(n);
    let out = "";
    for (const [value, numeral] of map) {
        while (n >= value) { out += numeral; n -= value; }
    }
    return out;
}

/* ---------- leaderboard ---------- */

function rankPizzerias(data) {
    const sorted = [...data].sort(
        (a, b) => b.average - a.average || b.ratings.length - a.ratings.length || a.name.localeCompare(b.name)
    );
    // Competition ranking: equal averages share a rank (1, 2, 3, 3, 5).
    let rank = 0;
    return sorted.map((p, i) => {
        if (i === 0 || p.average !== sorted[i - 1].average) rank = i + 1;
        return { ...p, rank };
    });
}

function renderPizzeria(p) {
    const ratings = [...p.ratings].sort((a, b) => b.score - a.score);

    const reviews = h("ul", { class: "reviews" },
        ...ratings.map(r => h("li", { class: "review" },
            h("div", { class: "review-head" },
                h("span", { class: "reviewer", text: r.reviewer }),
                h("span", { class: "review-score", text: `${r.score}/${MAX_SCORE}` })
            ),
            r.comment
                ? h("p", { class: "comment", text: r.comment })
                : h("p", { class: "comment empty", text: "No comment" })
        ))
    );

    const rateBtn = h("button", {
        type: "button",
        class: "rate-this",
        text: `Rate ${p.name}`,
        onclick: () => prefill(p.name),
    });

    const details = h("details", { class: "entry-details" },
        h("summary", { text: plural(ratings.length, "rating") }),
        reviews,
        rateBtn
    );
    if (openPizzerias.has(p.name)) details.open = true;
    details.addEventListener("toggle", () => {
        details.open ? openPizzerias.add(p.name) : openPizzerias.delete(p.name);
    });

    const rankText = theme().romanRanks ? toRoman(p.rank) : String(p.rank);

    return h("li", { class: `entry${p.rank === 1 ? " is-top" : ""}` },
        h("span", { class: "rank", "aria-label": `Rank ${p.rank}`, text: rankText }),
        h("div", { class: "entry-main" },
            h("div", { class: "entry-head" },
                h("h3", { class: "entry-name", text: p.name }),
                h("span", { class: "entry-score" },
                    scoreMeter(p.average),
                    h("strong", { class: "avg", text: formatScore(p.average) })
                )
            ),
            details
        )
    );
}

function renderSummary(data) {
    const total = data.reduce((n, p) => n + p.ratings.length, 0);
    els.summary.textContent = data.length
        ? `${plural(data.length, "pizzeria")} and ${plural(total, "rating")} so far. Scored 1 to 6.`
        : "Our pizzeria leaderboard, scored 1 to 6.";
}

function renderNames(data) {
    els.names.replaceChildren(...data.map(p => h("option", { value: p.name })));
}

function renderBoard(data) {
    if (data.length === 0) {
        els.showMore.hidden = true;
        els.list.replaceChildren(h("li", { class: "placeholder" },
            h("strong", { text: "No ratings yet." }), " Rate the last pizza you had."));
        return;
    }
    const ranked = rankPizzerias(data);
    els.list.replaceChildren(...ranked.map(p => {
        const item = renderPizzeria(p);
        // Ties on the cut-off rank stay visible, so "top 5" never splits a shared place.
        if (p.rank > TOP_COUNT) item.classList.add("is-extra");
        return item;
    }));
    updateShowMore(ranked.filter(p => p.rank > TOP_COUNT).length);
}

async function loadPizzerias() {
    els.list.setAttribute("aria-busy", "true");
    try {
        const res = await fetch(`${API}/pizzerias`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        lastData = data;

        renderSummary(data);
        renderNames(data);
        renderBoard(data);
    } catch (err) {
        els.showMore.hidden = true;
        console.error("Loading ratings failed:", err);
        els.list.replaceChildren(h("li", { class: "placeholder is-error" },
            "Couldn't load ratings. Check that the backend is running, then ",
            h("button", { type: "button", class: "link-btn", text: "try again", onclick: loadPizzerias }),
            "."
        ));
    } finally {
        els.list.setAttribute("aria-busy", "false");
    }
}

function updateShowMore(extraCount) {
    els.showMore.hidden = extraCount === 0;
    els.list.classList.toggle("is-collapsed", !showAll);
    els.showMore.setAttribute("aria-expanded", String(showAll));
    els.showMore.textContent = showAll
        ? theme().copy.showTop
        : `Show ${extraCount} more ${extraCount === 1 ? "pizzeria" : "pizzerias"}`;
    els.showMore.dataset.extra = extraCount;
}

function toggleShowAll() {
    showAll = !showAll;
    updateShowMore(Number(els.showMore.dataset.extra));
    if (showAll) {
        els.list.querySelector(".is-extra summary")?.focus({ preventScroll: true });
    }
}

/* ---------- theme switching ---------- */

function applyTheme(name, { animate = false } = {}) {
    if (!THEMES[name]) name = "pizzabox";
    currentTheme = name;
    const t = theme();

    document.documentElement.dataset.theme = name;
    els.themeColor.setAttribute("content", t.themeColor);
    document.getElementById(`theme-${name}`).checked = true;

    document.querySelectorAll("[data-copy]").forEach(el => {
        const text = t.copy[el.dataset.copy];
        if (text != null && !(el === els.submit && submitting)) el.textContent = text;
    });
    document.querySelectorAll("[data-copy-placeholder]").forEach(el => {
        el.placeholder = t.copy[el.dataset.copyPlaceholder];
    });
    document.querySelectorAll("use[data-score-icon]").forEach(u => u.setAttribute("href", `#${t.icon}`));
    els.picker.querySelectorAll(".score-option").forEach((label, i) => {
        const word = t.scoreWords[i + 1];
        label.title = word;
        label.querySelector(".visually-hidden").textContent = word;
    });
    updateScoreWord();
    if (lastData) renderBoard(lastData); // re-render for theme-specific rank numerals

    if (animate) {
        // One deliberate moment per switch (the neon title "powers on"); CSS skips it for reduced motion.
        document.documentElement.classList.remove("theme-enter");
        void document.documentElement.offsetWidth;
        document.documentElement.classList.add("theme-enter");
    }
}

function onThemeChange(e) {
    try { localStorage.setItem(THEME_KEY, e.target.value); } catch { /* storage unavailable */ }
    applyTheme(e.target.value, { animate: true });
}

/* ---------- form ---------- */

function buildScorePicker() {
    for (let i = 1; i <= MAX_SCORE; i++) {
        const id = `score-${i}`;
        const input = h("input", { type: "radio", name: "score", id, value: String(i), class: "visually-hidden" });
        input.addEventListener("change", updateScoreWord);
        const label = h("label", { for: id, class: "score-option", title: theme().scoreWords[i] },
            scoreIcon(),
            h("span", { class: "score-num", text: i }),
            h("span", { class: "visually-hidden", text: theme().scoreWords[i] })
        );
        els.picker.append(input, label);
    }
}

function selectedScore() {
    const checked = els.form.querySelector('input[name="score"]:checked');
    return checked ? Number(checked.value) : null;
}

function updateScoreWord() {
    const score = selectedScore();
    els.picker.querySelectorAll(".score-option").forEach((label, i) => {
        label.classList.toggle("is-on", score != null && i < score);
    });
    els.scoreWord.textContent = score ? `${score}: ${theme().scoreWords[score]}` : theme().copy.scoreHint;
}

function prefill(name) {
    els.pizzeria.value = name;
    document.getElementById("rate").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    (els.reviewer.value ? els.form.querySelector('input[name="score"]') : els.reviewer).focus({ preventScroll: true });
}

function showMessage(text, type) {
    els.message.textContent = text;
    els.message.className = `message is-${type}`;
    els.message.hidden = false;
    clearTimeout(showMessage.timer);
    if (type === "success") {
        showMessage.timer = setTimeout(() => { els.message.hidden = true; }, 5000);
    }
}

function fieldError(input, text) {
    showMessage(text, "error");
    input.focus();
    return false;
}

function validate() {
    if (!els.pizzeria.value.trim()) return fieldError(els.pizzeria, "Enter the pizzeria's name.");
    if (!els.reviewer.value.trim()) return fieldError(els.reviewer, "Enter your name.");
    if (!selectedScore()) return fieldError(els.form.querySelector('input[name="score"]'), "Pick a score from 1 to 6.");
    return true;
}

async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
        pizzeria: els.pizzeria.value.trim(),
        reviewer: els.reviewer.value.trim(),
        score: selectedScore(),
        comment: els.comment.value.trim(),
    };

    submitting = true;
    els.submit.disabled = true;
    els.submit.textContent = theme().copy.submitting;
    try {
        const res = await fetch(`${API}/rating`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Server responded with ${res.status}`);
        }

        try { localStorage.setItem(REVIEWER_KEY, payload.reviewer); } catch { /* storage unavailable */ }
        showMessage(`Rating added for ${payload.pizzeria}.`, "success");

        els.pizzeria.value = "";
        els.comment.value = "";
        els.form.querySelectorAll('input[name="score"]').forEach(r => { r.checked = false; });
        updateScoreWord();
        updateCounter();
        await loadPizzerias();
    } catch (err) {
        console.error("Adding rating failed:", err);
        showMessage(`Rating not added: ${err.message}`, "error");
    } finally {
        submitting = false;
        els.submit.disabled = false;
        els.submit.textContent = theme().copy.submit;
    }
}

function updateCounter() {
    els.commentCount.textContent = `${els.comment.value.length} / ${els.comment.maxLength}`;
}

function init() {
    buildScorePicker();
    try {
        const saved = localStorage.getItem(REVIEWER_KEY);
        if (saved) els.reviewer.value = saved;
    } catch { /* storage unavailable */ }

    document.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener("change", onThemeChange));
    applyTheme(currentTheme);

    els.form.addEventListener("submit", onSubmit);
    els.comment.addEventListener("input", updateCounter);
    els.showMore.addEventListener("click", toggleShowAll);
    loadPizzerias();
}

init();
