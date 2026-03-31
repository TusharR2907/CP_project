# Real-time Weather Dashboard

A full-stack, real-time weather tracking application built using Python. This project fulfills academic requirements by integrating a Python-based backend API with a Flask frontend.

## 🏗 Architecture
This project runs using two separate servers communicating with each other:
1. **FastAPI Backend (Port 8000):** Connects to the OpenWeatherMap API to retrieve current weather, hourly forecasts, and 5-day daily forecasts. It also manages WebSocket connections.
2. **Flask Frontend (Port 5000):** The web interface. It makes HTTP requests to the FastAPI backend, processes the weather data, and renders a dynamic, dark-mode dashboard using Jinja2 templates.

## ✨ Features
*   **Real-time Data:** Live weather updates pushed via WebSockets (auto-updates every 60 seconds without refreshing).
*   **City Search:** Fast geocoding search for finding cities worldwide.
*   **Comprehensive Forecasts:** Displays an interactive metrics grid, an hourly timeline, and a 5-day forecast.
*   **Premium UI:** A modern glassmorphism design with a responsive layout.

## 🚀 Getting Started

### 1. Prerequisites
You need Python installed. Install the required dependencies:
```bash
pip install -r requirements.txt
```

### 2. Configuration
You must provide an OpenWeatherMap API Key.
Create a `.env` file in the root directory (do not upload this file to GitHub) and add the following line:
```env
OWM_API_KEY=your_actual_api_key_here
```
*(Alternatively, you can edit `config.py` directly, but be careful not to upload your key publicly!)*

### 3. Run the Application
Because of the separated architecture, you must run both servers simultaneously in different terminal windows.

**Start the Backend (Terminal 1):**
```bash
python -m uvicorn main:app --port 8000
```

**Start the Frontend (Terminal 2):**
```bash
python app.py
```

### 4. View the App
Open your web browser and navigate to:
`http://127.0.0.1:5000/`

## 📁 Project Structure
*   `main.py`: The FastAPI application entry point.
*   `routers/`: Backend API routes (Weather & Forecast).
*   `websocket_manager.py`: Handles WebSocket live connections.
*   `app.py`: The Flask frontend application entry point.
*   `templates/`: HTML structures using Jinja2 (`dashboard.html`, `search_results.html`).
*   `static/`: Contains the CSS (`style.css`) and minimal JS (`app.js`).
