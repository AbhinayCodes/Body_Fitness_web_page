from __future__ import annotations

import json
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
DATA_FILE = ROOT / "data.json"

DEFAULT_STATE = {
    "profile": {
        "name": "Rahul",
        "goal": "Build muscle",
        "days": "4 days / week",
        "diet": "Vegetarian",
    },
    "mealDone": False,
    "workoutHistory": [],
    "mealHistory": [],
}


def load_state():
    if not DATA_FILE.exists():
        save_state(DEFAULT_STATE)
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        save_state(DEFAULT_STATE)
        return DEFAULT_STATE.copy()


def save_state(state):
    DATA_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


class FitnessHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            self.send_json(load_state())
            return
        super().do_GET()

    def do_PUT(self):
        if urlparse(self.path).path != "/api/profile":
            self.send_error(404, "Unknown API route")
            return
        payload = self.read_json()
        state = load_state()
        state["profile"].update({
            key: payload[key]
            for key in ("name", "goal", "days", "diet")
            if key in payload and isinstance(payload[key], str)
        })
        save_state(state)
        self.send_json(state["profile"])

    def do_POST(self):
        path = urlparse(self.path).path
        payload = self.read_json()
        state = load_state()
        today = date.today().isoformat()

        if path == "/api/workouts":
            entry = {
                "date": today,
                "exercises": payload.get("exercises", []),
                "durationMinutes": payload.get("durationMinutes", 52),
            }
            state["workoutHistory"].append(entry)
            save_state(state)
            self.send_json(entry, 201)
            return

        if path == "/api/meals":
            entry = {"date": today, "meal": payload.get("meal", "Paneer rice bowl")}
            state["mealDone"] = True
            state["mealHistory"].append(entry)
            save_state(state)
            self.send_json(entry, 201)
            return

        self.send_error(404, "Unknown API route")

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            return json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self.send_error(400, "Expected JSON")
            return {}

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), FitnessHandler)
    print(f"Formwell running at http://127.0.0.1:{port}")
    server.serve_forever()
