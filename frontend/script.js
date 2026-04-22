const API = "/api";

async function loadPizzerias() {
    const list = document.getElementById("list");
    const loading = list.querySelector(".loading");

    try {
        const res = await fetch(`${API}/pizzerias`);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (loading) loading.remove();

        if (data.length === 0) {
            list.innerHTML = '<div class="pizzeria" style="text-align: center; padding: 40px;"><h3>🍕 No ratings yet!</h3><p>Be the first to rate a pizzeria!</p></div>';
            return;
        }

        list.innerHTML = "";

        // Sort pizzerias by average rating (highest first)
        data.sort((a, b) => b.average - a.average);

        data.forEach(p => {
            const div = document.createElement("div");
            div.className = "pizzeria";

            // Sort ratings by score (highest first) within each pizzeria
            const sortedRatings = [...p.ratings].sort((a, b) => b.score - a.score);

            div.innerHTML = `
                <h2>
                    ${p.name}
                    <span class="average">⭐ ${p.average.toFixed(1)}</span>
                </h2>
                ${sortedRatings.map(r =>
                    `<p>
                        <span class="reviewer">${r.reviewer}</span>
                        <span class="score">(${r.score}/6)</span><br>
                        <span class="comment">${r.comment || 'No comment'}</span>
                    </p>`
                ).join("")}
            `;
            list.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading pizzerias:', error);
        if (loading) loading.remove();
        list.innerHTML = '<div class="pizzeria message error">❌ Error loading ratings. Please try again later.</div>';
    }
}

document.getElementById("ratingForm").onsubmit = async e => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    // Get form elements
    const pizzeriaInput = document.getElementById("pizzeria");
    const reviewerInput = document.getElementById("reviewer");
    const scoreInput = document.getElementById("score");
    const commentInput = document.getElementById("comment");

    // Validate inputs
    if (!pizzeriaInput.value.trim()) {
        showMessage('Please enter a pizzeria name', 'error');
        pizzeriaInput.focus();
        return;
    }

    if (!reviewerInput.value.trim()) {
        showMessage('Please enter your name', 'error');
        reviewerInput.focus();
        return;
    }

    const score = parseInt(scoreInput.value);
    if (!score || score < 1 || score > 6) {
        showMessage('Please enter a valid rating between 1 and 6', 'error');
        scoreInput.focus();
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';

    try {
        const res = await fetch(`${API}/rating`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pizzeria: pizzeriaInput.value.trim(),
                reviewer: reviewerInput.value.trim(),
                score: score,
                comment: commentInput.value.trim()
            })
        });

        if (res.ok) {
            showMessage('✅ Rating submitted successfully!', 'success');
            e.target.reset();
            loadPizzerias();
        } else {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${res.status}`);
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showMessage(`❌ Error submitting rating: ${error.message}`, 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
};

function showMessage(text, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;

    const formCard = document.querySelector('.form-card');
    formCard.insertBefore(messageDiv, formCard.querySelector('form'));

    // Auto-remove success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Load pizzerias on page load
document.addEventListener('DOMContentLoaded', loadPizzerias);
