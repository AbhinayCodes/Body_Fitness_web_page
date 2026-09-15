# Migration Analysis — Formwell (Body Fitness App)

_Analysis only. No code was modified as part of this phase._

## 1. Current Architecture

**Pattern:** Single-Page Application (SPA) with a hand-rolled client-side router/state machine, backed by a minimal REST-style API, persisted to a flat JSON file.

```
Browser (index.html + app.js + styles.css)
        │  fetch() JSON over HTTP
        ▼
Backend (server.py OR server.ps1 — two equivalent implementations)
        │  read/write
        ▼
data.json (single shared state file, acts as the "database")
```

- There is **no build step, no framework, no bundler, no package manager** (no `package.json`, `requirements.txt`, etc.). Everything runs directly in the browser / via a raw Python or PowerShell HTTP server.
- Two backend implementations exist in parallel and must stay in sync manually:
  - `server.py` — Python, uses `http.server.ThreadingHTTPServer` + `SimpleHTTPRequestHandler` (stdlib only, no framework).
  - `server.ps1` — PowerShell, uses `System.Net.HttpListener` (stdlib only).
  - Both serve static files AND the JSON API on port 8000, and both read/write `data.json` directly (no locking/concurrency control).
- Frontend can also run standalone by opening `index.html` directly (`file://`), in which case it silently falls back to in-memory-only default state (API calls fail and are caught).

## 2. Current File Structure

| File | Role |
|---|---|
| `index.html` | Single HTML shell; loads Google Fonts, `styles.css`, `app.js`. Contains one `<div id="app">` mount point — everything else is rendered via JS. |
| `app.js` | Entire application logic: state, routing, rendering (via template-literal HTML strings + `innerHTML`), event binding, API calls. ~50 dense lines (minified-style, one statement per line). |
| `styles.css` | All styling, CSS custom properties (design tokens), responsive breakpoint at 800px, no CSS framework. |
| `data.json` | Persisted app state: profile, meal/workout completion flags, history arrays. Acts as the only data store. |
| `server.py` | Python backend/API + static file server. |
| `server.ps1` | PowerShell backend/API + static file server (duplicate of `server.py`'s behavior). |

## 3. Frontend Functionality

- **Rendering model:** `render()` rebuilds `#app` innerHTML from scratch on every state change (no virtual DOM/diffing), then `bind()` re-attaches all event listeners. Classic "manual re-render" SPA pattern.
- **Views (client-side "router" via `state.view`, no URL routing/history API, no deep-linking):**
  - `dashboard` (default/"Today") — greeting, streak, today's workout card, nutrition/macro summary, next meal card, weekly schedule, weekly consistency chart.
  - `workout` — full exercise list with checkable sets, "Log each set" / "Finish workout" action.
  - `diet` — meal schedule for the day with kcal, "Log next meal" action.
  - `calendar` — static weekly calendar view (hardcoded days).
  - `progress` — strength trend chart (hardcoded bar heights) + goal ring.
  - `profile` — shows profile fields, "Update preferences" opens onboarding modal.
- **Modals** (`state.modal`):
  - `workout` modal — same exercise-logging UI as workout page, in overlay form.
  - `meal` modal — meal detail (Paneer rice bowl), ingredients, "I ate this" / "Replace meal" (replace is just an `alert()`, non-functional stub).
  - `onboarding` — 4-step wizard (Basics/Goal/Schedule/Food) to edit profile; step 1 "Age/Height/Weight" fields are **not wired to state** (no `data-profile` binding except name).
- **Navigation:** Sidebar (desktop) + bottom nav bar (mobile, CSS breakpoint 800px) + "Settings" button (unbound, no-op).
- **Local state (`state` object):** `view`, `modal`, `step` (onboarding wizard step), `mealDone`, `exerciseDone` (array of completed exercise indices), `profile` (name, goal, days, diet).

## 4. Backend Functionality / Routes

Both `server.py` and `server.ps1` expose the same 4 endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | Returns entire persisted state (creates default file if missing). |
| PUT | `/api/profile` | Updates `name`, `goal`, `days`, `diet` fields on profile, persists, returns updated profile. |
| POST | `/api/workouts` | Appends a workout history entry `{date, exercises, durationMinutes}`, persists. |
| POST | `/api/meals` | Sets `mealDone = true`, appends meal history entry `{date, meal}`, persists. |

Plus static file serving for `index.html`, `app.js`, `styles.css`, `data.json` (default fallback route), and CORS headers (`Access-Control-Allow-Origin: *`) with `OPTIONS` preflight handling.

**Notable gaps:** No authentication/authorization, no input validation beyond type-checking strings, no DELETE/GET for individual workout/meal history, no pagination, `data.json` is written with no file locking (race condition risk under concurrent requests), CORS is wide open (`*`).

## 5. Data Structure (`data.json`)

```json
{
  "profile": { "name": "", "goal": "", "days": "", "diet": "" },
  "mealDone": false,
  "workoutHistory": [ { "date": "YYYY-MM-DD", "exercises": [0,1,2], "durationMinutes": 52 } ],
  "mealHistory": [ { "date": "YYYY-MM-DD", "meal": "string" } ]
}
```

- Single global blob — no multi-user support, no IDs, no schema/versioning.
- `exercises` array in `workoutHistory` stores indices into the hardcoded `exercises` list in `app.js`, not exercise identity/data — tightly couples backend history to frontend hardcoded content.

## 6. Frontend ↔ Backend Communication

- `app.js` defines `API_BASE` = `/api` when served from the backend, or `http://127.0.0.1:8000/api` when opened via `file://` (dev convenience fallback).
- Generic `api(path, options)` helper wraps `fetch`, forces `Content-Type: application/json`, throws on non-2xx.
- On load, `hydrate()` calls `GET /api/state` to restore profile + `mealDone`, silently degrades to defaults on failure (console.info only — no user-facing error state).
- Mutations (`saveProfile`, meal logging, workout completion) are fire-and-forget (`.catch(console.error)`) — UI updates optimistically before confirming server persistence; no retry/error surfacing to user.

## 7. Hardcoded vs Dynamic Data

**Hardcoded (in `app.js`, not sourced from backend/data.json):**
- Exercise list (5 exercises with sets/reps text).
- Diet page meal list, calories, times.
- Progress page chart values, calendar entries, streak ("06"), consistency %, macro totals (1,820/2,400 kcal, protein/carbs/fat targets), schedule times.
- Date text "Thursday · September 10, 2026" and "Week 06 of 12" are static strings, not computed from real date.
- Onboarding step 1 age/height/weight defaults ("26", "175 cm", "72 kg") — display-only, not persisted.

**Dynamic (round-trips through backend/data.json):**
- `profile` (name, goal, days, diet).
- `mealDone` flag.
- `exerciseDone` is dynamic client-side but only persisted as a full `workoutHistory` entry once all 5 are checked (not resumable across reloads — resets to `[]` on refresh since it's never fetched from state).

## 8. Existing Dependencies

- **Frontend:** None (no npm packages). External: Google Fonts (`DM Mono`, `Manrope`) via CDN link tags.
- **Backend:** Python stdlib only (`json`, `http.server`, `pathlib`, `urllib.parse`, `datetime`) — no `requirements.txt`/pip packages. PowerShell backend uses only built-in .NET classes.
- **Tooling:** None — no linter, formatter, test framework, bundler, or CI config found.

## 9. What Can Be Reused

- Design tokens in `styles.css` (`:root` CSS variables) — portable to any framework.
- Overall visual/IA structure (sidebar + views + modals) as a spec for rebuilding.
- API contract (4 endpoints) is simple and framework-agnostic; can be reimplemented behind same paths.
- `data.json` shape can seed an initial schema/migration for a real database.
- Copy/content (labels, meal names, exercise names) can carry over directly.

## 10. What Needs to Be Rewritten

- Rendering approach (manual `innerHTML` rebuild) — not component-based, no keyed diffing, all event listeners destroyed/recreated on each render.
- Client-side routing — no real URL routing (no back/forward button support, no shareable links, no `history.pushState`).
- Duplicate backend implementations (`server.py` + `server.ps1`) — pick one stack going forward; maintaining two is technical debt.
- Hardcoded content (exercises, meals, progress/calendar data) needs to move server/data-side to be genuinely dynamic.
- Data layer: flat JSON file has no concurrency safety, no multi-user support, no indexing — needs a real datastore for growth.
- Onboarding wizard incomplete bindings (age/height/weight not wired) need proper handling either way.

## 11. What Could Potentially Break During Migration

- Any consumer relying on `file://` fallback + hardcoded `127.0.0.1:8000` API base.
- `workoutHistory.exercises` stores numeric indices tied to the hardcoded exercise array order — if exercise list order changes, historical data reinterprets incorrectly.
- CORS wildcard (`*`) currently masks any origin-config issues; tightening it later could break local testing setups.
- No schema versioning on `data.json` — a migration script must account for existing real user data already present in the file (profile "Rahul", one workout entry, one meal entry already recorded as of this analysis).
- Losing the "two servers do the same thing" behavior could break whichever workflow (Python vs PowerShell) a given environment currently depends on — confirm which is actually in use before retiring one.
- Because state is rebuilt from scratch on the client (`exerciseDone` not restored from backend), any migration that starts persisting/restoring it will change existing observed behavior (currently resets on refresh).

## 12. Recommended Migration Order

1. **Stabilize backend contract first**: consolidate to a single backend implementation (pick Python or PowerShell) before any frontend rewrite, keeping the same 4 routes/shapes so the current frontend keeps working unmodified during transition.
2. **Introduce a real data layer** behind the same API contract (e.g., swap `data.json` for SQLite/Postgres) without changing routes/response shapes — validate frontend still works.
3. **Move hardcoded content (exercises, meals, progress/calendar data) into the data layer**, exposing new read endpoints, while keeping old UI rendering logic reading from API instead of literals.
4. **Introduce real client-side routing** (URL-based) incrementally, one view at a time, keeping the existing render functions as a bridge.
5. **Componentize the frontend** (framework of choice) view-by-view, starting with the least interactive page (e.g., `calendar`/`progress`) and ending with the most stateful (`workout` modal, onboarding wizard).
6. **Add validation, auth, and concurrency safety** to the backend once the data model and routes are finalized.
7. Retire the redundant server implementation and any dead code (e.g., non-functional "Replace meal" alert, unbound "Settings" button) once parity is confirmed.
