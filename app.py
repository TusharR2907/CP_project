"""
Flask Frontend for Real-time Weather Dashboard
===============================================
This Flask application serves as the frontend layer.
It fetches weather data from the FastAPI backend using Python's requests library,
processes the data, and renders it via Jinja2 templates.
"""

import os
import requests
from flask import Flask, render_template, request, jsonify, redirect, url_for
from datetime import datetime, timezone

# ── Configuration ─────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config["SECRET_KEY"] = "weather-dashboard-secret-key"

# FastAPI backend URL (Configured for local or production)
api_raw = os.environ.get("API_BASE", "http://127.0.0.1:8000")
if not api_raw.startswith("http"):
    api_raw = f"https://{api_raw}"
    
API_BASE = api_raw
WS_BASE = API_BASE.replace("http://", "ws://").replace("https://", "wss://")


# ── Python Helper Functions ───────────────────────────────────────────────────

def degrees_to_compass(deg):
    """Convert wind direction in degrees to a compass direction string."""
    directions = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]
    index = round(deg / 22.5) % 16
    return directions[index]


def format_unix_time(timestamp, tz_offset=0):
    """Convert a UNIX timestamp to a human-readable time string like '6:30 AM'."""
    from datetime import timedelta
    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc) + timedelta(seconds=tz_offset)
    return dt.strftime("%I:%M %p")


def format_date_short(date_str):
    """Convert '2026-03-28' to 'Sat, Mar 28'."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%a, %b %d")


def meters_to_km(meters):
    """Convert visibility from meters to kilometers."""
    return round(meters / 1000, 1)


def fetch_weather(city):
    """
    Fetch current weather data from the FastAPI backend.
    Returns a processed dictionary or None on error.
    """
    try:
        response = requests.get(
            f"{API_BASE}/api/weather/current",
            params={"city": city},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            # Process data in Python before sending to template
            data["wind_direction"] = degrees_to_compass(data["wind"]["deg"])
            data["wind_speed_kmh"] = round(data["wind"]["speed"] * 3.6, 1)
            data["visibility_km"] = meters_to_km(data["visibility"])
            data["sunrise_time"] = format_unix_time(
                data["sun"]["sunrise"], data.get("timezone", 0)
            )
            data["sunset_time"] = format_unix_time(
                data["sun"]["sunset"], data.get("timezone", 0)
            )
            data["updated_time"] = format_unix_time(
                data["dt"], data.get("timezone", 0)
            )
            return data
        return None
    except requests.exceptions.RequestException:
        return None


def fetch_forecast(city):
    """
    Fetch 5-day daily forecast from the FastAPI backend.
    Returns a processed dictionary or None on error.
    """
    try:
        response = requests.get(
            f"{API_BASE}/api/forecast/daily",
            params={"city": city, "days": 5},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            # Process dates in Python
            for day in data.get("daily", []):
                day["date_display"] = format_date_short(day["date"])
            return data
        return None
    except requests.exceptions.RequestException:
        return None


def fetch_hourly(city):
    """
    Fetch hourly forecast from the FastAPI backend.
    Returns a processed dictionary or None on error.
    """
    try:
        response = requests.get(
            f"{API_BASE}/api/forecast/hourly",
            params={"city": city, "hours": 24},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            # Process times in Python
            for slot in data.get("hourly", []):
                slot["time_short"] = format_unix_time(
                    slot["dt"], data.get("timezone_offset", 0)
                )
            return data
        return None
    except requests.exceptions.RequestException:
        return None


def search_cities(query):
    """
    Search for cities using the FastAPI backend's geocoding endpoint.
    Returns a list of matching cities or an empty list on error.
    """
    try:
        response = requests.get(
            f"{API_BASE}/api/weather/search",
            params={"q": query},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        return []
    except requests.exceptions.RequestException:
        return []


# ── Flask Routes (Page Routes) ───────────────────────────────────────────────

@app.route("/")
def dashboard():
    """
    Home page — fetches weather, forecast, and hourly data using Python,
    then passes everything to the Jinja2 template.
    """
    city = request.args.get("city", "London")

    # All API calls happen in Python
    weather_data = fetch_weather(city)
    forecast_data = fetch_forecast(city)
    hourly_data = fetch_hourly(city)

    # Check if backend is reachable
    if weather_data is None:
        return render_template(
            "dashboard.html",
            error=True,
            error_message=f"Could not connect to the weather API. Backend reachable check failed.",
            city=city,
            ws_url=WS_BASE
        )

    return render_template(
        "dashboard.html",
        weather=weather_data,
        forecast=forecast_data,
        hourly=hourly_data,
        city=city,
        error=False,
        ws_url=WS_BASE
    )


@app.route("/city/<name>")
def city_weather(name):
    """
    Weather detail page for a specific city.
    Redirects to the dashboard with the city parameter.
    """
    return redirect(url_for("dashboard", city=name))


@app.route("/search")
def search():
    """
    Search results page — queries the backend using Python
    and renders results in a template.
    """
    query = request.args.get("q", "").strip()

    if not query or len(query) < 2:
        return render_template(
            "search_results.html",
            query=query,
            results=[],
            error_message="Please enter at least 2 characters to search."
        )

    # Python calls the FastAPI backend for search
    results = search_cities(query)

    return render_template(
        "search_results.html",
        query=query,
        results=results,
        error_message=None
    )


# ── Flask Routes (API Proxy for JS) ──────────────────────────────────────────
# These proxy routes let the minimal JS (search autocomplete) call
# through Flask so we avoid CORS issues.

@app.route("/api/search")
def api_search_proxy():
    """Proxy search requests to the FastAPI backend (used by JS autocomplete)."""
    query = request.args.get("q", "")
    if len(query) < 2:
        return jsonify([])
    results = search_cities(query)
    return jsonify(results)


# ── Run the Flask App ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Weather Dashboard Frontend")
    print("  Open http://127.0.0.1:5000 in your browser")
    print("  Make sure FastAPI backend is running on port 8000")
    print("=" * 60)
    app.run(debug=True, port=5000)
