# Current Features — Formwell (Body Fitness App)

_Snapshot of everything currently working, with a migration disposition for each._

Legend: **KEEP** = works well, carry over as-is · **MIGRATE** = works, move to new stack unchanged · **IMPROVE** = works but has known gaps to fix during migration · **REPLACE** = should be rebuilt/replaced, not directly ported.

## Navigation & Shell

| Feature | Status | Notes |
|---|---|---|
| Sidebar navigation (desktop) between Today/Workout/Nutrition/Calendar/Progress/Profile | MIGRATE | Works via `data-view` click handlers; no URL routing. |
| Bottom nav bar (mobile, <800px) | MIGRATE | CSS-only breakpoint, subset of views (no Calendar). |
| Active nav state highlighting | KEEP | Simple class toggle, trivial to replicate in any framework. |
| "Settings" sidebar button | REPLACE | No `data-action` handler bound — currently a dead button. |
| Brand/logo link | KEEP | Static link, cosmetic only. |
| Responsive layout (mobile/desktop breakpoint) | MIGRATE | Single 800px breakpoint; functional but not thoroughly tested across sizes. |

## Dashboard ("Today")

| Feature | Status | Notes |
|---|---|---|
| Greeting with profile name | MIGRATE | Reads `state.profile.name`, dynamic. |
| Date/week display ("Thursday · Sept 10, 2026", "Week 06 of 12") | REPLACE | Fully hardcoded string, not computed from real date/program length. |
| Consistency streak counter ("06 day streak") | REPLACE | Hardcoded value, not derived from history. |
| Today's workout card (name, duration, focus areas) | REPLACE | Hardcoded copy ("Upper strength", "52 min", etc.), not driven by a real workout plan/schedule. |
| "Start workout" button → opens workout modal | KEEP | Functional interaction pattern; content behind it needs to become dynamic. |
| Nutrition/macro summary card (kcal, protein/carbs/fat progress bars) | REPLACE | All target/consumed numbers are hardcoded constants. |
| Next meal card + "View meal"/"Logged" toggle | IMPROVE | Meal name hardcoded ("Paneer rice bowl"); logging flow (state + API call) is functional and reusable. |
| Weekly schedule list (breakfast/lunch/workout/dinner/sleep times) | REPLACE | Fully static list, not derived from an actual schedule. |
| Weekly consistency bar chart + "3 of 4 workouts complete" copy | REPLACE | Bar heights and copy are hardcoded, not computed from `workoutHistory`. |

## Workout

| Feature | Status | Notes |
|---|---|---|
| Exercise list rendering | REPLACE | Exercise data is a hardcoded JS array (`exercises`), not sourced from backend/data.json. |
| Per-exercise "check off set" toggle (`data-exercise`) | MIGRATE | Working interaction logic (toggle in/out of `exerciseDone` array); needs a real data-backed exercise ID instead of array index. |
| "Log each set above" / "Finish workout" button state | KEEP | Conditional label logic based on completion count is fine to reuse. |
| Workout completion → `POST /api/workouts` | MIGRATE | Functional, persists `{date, exercises, durationMinutes}` to `data.json`; duration is hardcoded to 52 regardless of actual time spent. |
| Exercise-done state persists across page navigation within session | IMPROVE | Works in-memory only; resets on page reload since it's never fetched back from `/api/state`. |
| Workout modal (same content as page, in overlay) | IMPROVE | Duplicated markup/logic between page view and modal — should be unified into one reusable component. |

## Nutrition / Diet

| Feature | Status | Notes |
|---|---|---|
| Daily meal schedule list with calories | REPLACE | Hardcoded meal names/times/kcal in `dietPage()`. |
| "Log next meal" / "Meal logged" toggle | MIGRATE | Functional state + API integration, reusable pattern. |
| Meal detail modal (ingredients, macros) | REPLACE | All ingredient/macro data hardcoded for a single meal ("Paneer rice bowl"), regardless of which meal was clicked. |
| "I ate this" → `POST /api/meals` | MIGRATE | Functional, persists `{date, meal}` and sets `mealDone=true` in `data.json`. |
| "Replace meal" button | REPLACE | Currently just shows a static `alert()` — no real functionality. |

## Calendar

| Feature | Status | Notes |
|---|---|---|
| Monthly/weekly workout calendar view | REPLACE | Entirely hardcoded list of 4 fixed entries ("Mon 07", "Tue 08", etc.) — not a real calendar or tied to actual scheduling/history data. |

## Progress

| Feature | Status | Notes |
|---|---|---|
| Strength trend summary ("+8%", bench press progression text) | REPLACE | Hardcoded copy and numbers. |
| 6-week bar chart | REPLACE | Hardcoded bar heights, not computed from `workoutHistory`. |

## Profile

| Feature | Status | Notes |
|---|---|---|
| Profile summary (name, goal, training days, diet style) | MIGRATE | Reads live from `state.profile`, dynamic and functional. |
| "Plan created" date | REPLACE | Hardcoded ("Aug 03, 2026"), not a real stored value. |
| "Update preferences" → opens onboarding wizard | KEEP | Functional modal trigger, reusable pattern. |

## Onboarding / Edit Preferences Wizard (4-step modal)

| Feature | Status | Notes |
|---|---|---|
| Step 1 — Basics (Name field) | IMPROVE | Only `name` is wired to state (`data-profile="name"`); Age/Height/Weight inputs are display-only defaults with no persistence. |
| Step 1 — Age/Height/Weight fields | REPLACE | Not bound to state at all; values are static placeholders regardless of user input. |
| Step 2 — Goal selection (choice buttons) | MIGRATE | Functional, updates `state.profile.goal` and re-renders selected state. |
| Step 3 — Training days selection | MIGRATE | Functional, updates `state.profile.days`. |
| Step 3 — Session length choice buttons | REPLACE | Rendered but not wired to any state field (no `data-*` handler). |
| Step 4 — Diet style selection | MIGRATE | Functional, updates `state.profile.diet`. |
| Step progress indicator (4 dots) | KEEP | Purely presentational, trivial to reuse. |
| "Next"/final step → `saveProfile()` → `PUT /api/profile` | MIGRATE | Functional, persists profile fields to `data.json`. |
| Modal close (×) | KEEP | Simple state reset, works fine. |

## Backend / API

| Feature | Status | Notes |
|---|---|---|
| `GET /api/state` | MIGRATE | Returns full state blob; contract can be preserved behind a new data layer. |
| `PUT /api/profile` | MIGRATE | Field-level update with basic type filtering; validation should be improved. |
| `POST /api/workouts` | MIGRATE | Appends history entry; needs real exercise identity instead of raw indices. |
| `POST /api/meals` | MIGRATE | Appends history entry + sets `mealDone`; should support arbitrary meal identity, not a single default. |
| Static file serving (index.html/app.js/styles.css) | REPLACE | Fine for a prototype; a real migration would use a proper static hosting/build pipeline. |
| CORS (`Access-Control-Allow-Origin: *`) | IMPROVE | Currently wide open; should be scoped once a real deployment target is known. |
| Duplicate implementations (`server.py` + `server.ps1`) | REPLACE | Redundant; consolidate to one backend stack. |
| No input validation beyond type checks | IMPROVE | No auth, no sanitization beyond `isinstance(str)` checks; must be hardened. |
| No concurrency/locking on `data.json` writes | REPLACE | File-based single-blob storage is not safe for concurrent access; needs a real database. |

## Data

| Feature | Status | Notes |
|---|---|---|
| `data.json` as sole data store | REPLACE | Single global blob, no multi-user support, no schema versioning — replace with a real database as part of migration. |
| Existing seeded data (profile "Rahul", 1 workout entry, 1 meal entry) | MIGRATE | Should be preserved/imported into whatever new data store is introduced. |
