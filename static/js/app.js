/**
 * Weather Dashboard — Premium Gold/Black Interactions
 * ========================================
 * 1. Search autocomplete (debounced input)
 * 2. WebSocket live updates (real-time temperature refresh)
 * 3. Parallax effect for satellite cards
 * 4. Intersection observer for scroll animations
 */

document.addEventListener("DOMContentLoaded", function () {
    initSearchAutocomplete();
    initWebSocket();
    initParallax();
    initScrollAnimations();
});

// ── 1. Search Autocomplete ─────────────────────────────────────────────────
function initSearchAutocomplete() {
    const input = document.getElementById("search-input");
    const dropdown = document.getElementById("autocomplete-dropdown");

    if (!input || !dropdown) return;

    let debounceTimer = null;

    input.addEventListener("input", function () {
        const query = input.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
            dropdown.classList.remove("active");
            dropdown.innerHTML = "";
            return;
        }

        debounceTimer = setTimeout(function () {
            fetchAutocompleteResults(query, dropdown);
        }, 300);
    });

    document.addEventListener("click", function (e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
}

function fetchAutocompleteResults(query, dropdown) {
    fetch("/api/search?q=" + encodeURIComponent(query))
        .then(response => response.json())
        .then(results => {
            if (results.length === 0) {
                dropdown.classList.remove("active");
                dropdown.innerHTML = "";
                return;
            }

            let html = "";
            for (let i = 0; i < results.length; i++) {
                const city = results[i];
                const detail = city.state ? city.state + ", " + city.country : city.country;

                html += `<a class="autocomplete-item" href="/?city=${encodeURIComponent(city.name)}">
                    <span class="ac-city" style="font-family:'Playfair Display',serif; color:#c9b8a0;">${escapeHtml(city.name)}</span>
                    <span class="ac-detail">${escapeHtml(detail)}</span>
                </a>`;
            }

            dropdown.innerHTML = html;
            dropdown.classList.add("active");
        })
        .catch(() => dropdown.classList.remove("active"));
}

// ── 2. WebSocket Live Updates ──────────────────────────────────────────────
function initWebSocket() {
    const cityInput = document.getElementById("current-city");
    const wsUrlInput = document.getElementById("ws-url-base");
    const liveIndicator = document.getElementById("live-indicator");

    if (!cityInput || !wsUrlInput || !liveIndicator) return;

    const city = cityInput.value;
    const wsBase = wsUrlInput.value;
    const wsUrl = wsBase + "/ws/weather?city=" + encodeURIComponent(city);

    try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            console.log("[WebSocket] Connected for live updates");
            liveIndicator.style.display = "flex";
        };

        ws.onmessage = function (event) {
            const data = JSON.parse(event.data);

            if (data.type === "weather_update") {
                const tempEl = document.getElementById("temp-value");
                if (tempEl) {
                    const newTemp = parseFloat(data.temp).toFixed(1);
                    // Handle inner HTML for superscript '°'
                    if (!tempEl.innerHTML.includes(newTemp)) {
                        tempEl.innerHTML = newTemp + "<sup>°</sup>";
                        tempEl.style.transition = "color 0.5s ease";
                        tempEl.style.color = "#e8d5b7"; // hover gold
                        setTimeout(() => tempEl.style.color = "", 1000);
                    }
                }

                const descEl = document.getElementById("weather-desc");
                if (descEl && data.description) {
                    descEl.innerHTML = capitalise(data.description);
                }
            }
        };

        ws.onclose = function () {
            const dot = liveIndicator.querySelector(".live-dot");
            const text = liveIndicator.querySelector(".live-status");
            if (dot) {
                dot.style.background = "#64748b";
                dot.style.animation = "none";
            }
            if (text) {
                text.textContent = "OFFLINE";
                text.style.color = "#64748b";
            }
        };

    } catch (e) {
        console.log("[WebSocket] Not available");
    }
}

// ── 3. Mouse Parallax Effect ───────────────────────────────────────────────
function initParallax() {
    document.addEventListener("mousemove", (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 50;
        const y = (window.innerHeight / 2 - e.pageY) / 50;

        document.querySelectorAll(".metric-card, .team-card, .pricing-card").forEach(el => {
            el.style.transform = `translate(${x}px, ${y}px)`;
        });
        
        // Slightly move the SVG neural lines to create depth
        const canvas = document.getElementById("neural-canvas");
        if(canvas) {
            canvas.style.transform = `translate(${x*0.5}px, ${y*0.5}px)`;
        }
    });
}

// ── 4. Scroll Reveal Animations ────────────────────────────────────────────
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.metric-card, .hourly-scroll, .pricing-card').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
}

// ── Helper Functions ───────────────────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function capitalise(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}
