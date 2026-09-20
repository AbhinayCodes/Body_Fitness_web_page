# Live API and Browser Audit

Date: 2026-09-20

Target: https://body-fitness-web-page.onrender.com

All browser workflows and live API checks used the deployed site's `/api/v1` proxy, with real responses and no mocked data or localhost application server. Local unit tests and typechecks separately validated workspace changes. The user authorized synthetic data on the supplied account. Phone numbers, tokens, and account identifiers are omitted here.

## Findings

1. **High: phone-only login grants access without proving phone ownership.** `POST /auth/phone-login` returned `201` and an access token without an OTP. Protected routes require a token, but that does not protect accounts when anyone knowing a phone number can obtain one. Production OTP delivery returned `503`, `SMS delivery is not configured.` Authentication needs verified ownership before production use. No authentication behavior was changed in this task.
2. **Login/setup failure reproduced and repaired in workspace.** The initial saved setup was `{ "currentStep": 1, "completed": false }`. The returning-user login skipped onboarding, then `/today` returned `400`. Nutrition, workout generation, daily scheduling, and reminders also failed for that missing prerequisite. The frontend now checks persisted setup on every authenticated mount, including refresh, before mounting dashboard requests. It requires completion and the schedule fields, and offers retry if the setup read fails. Completing synthetic setup through the existing live UI made the deployed account work immediately; the general code fix still requires deployment.
3. **Workout progress accepts above-target sets; repaired in workspace.** A live request with `setsCompleted: 10` for a two-set exercise returned `200`. `/today` then reported 16/8 sets and 117% consistency. The service now rejects above-target counts before writing a session. Five regression cases cover rejection and valid counts. The live test record was restored to two sets, returning adherence to 67%. The backend fix is not deployed.
4. **Mobile logout is unavailable.** All six mobile views were reachable, but the only logout button is in the sidebar hidden at mobile sizes. This remains unresolved.

## Route Coverage

31 distinct `/api/v1` method/route patterns were exercised. 29 had successful authenticated or login requests; OTP send/verify success paths remain unavailable or unverified. This is route-level functional coverage, not an exhaustive security or load test. Legacy `/api/*` aliases were not separately tested.

Authenticated requests used `Authorization: Bearer [REDACTED]`. JSON writes used `Content-Type: application/json`. IDs below represent records returned for the authorized account.

### Reads

| GET path | Initial status | After setup | Observed response |
| --- | --- | --- | --- |
| `/auth/me` | 200 | 200 | `user` with identity fields |
| `/state` | 200 | 200 | `profile`, `mealDone`, meal/workout histories |
| `/onboarding` | 200 | 200 | Draft initially; completed editable setup after saves |
| `/nutrition/targets` | 400 | 200 | `status`, `targets`, `metadata` |
| `/workouts/plan` | 400 | 200 | Generated plan, three selected training days, exercises |
| `/schedule/today` | 400 | 200 | Schedule, three meals, workout plan day |
| `/today` | 400 | 200 | `READY`, profile, nutrition, schedule, adherence, activity |
| `/progress` | 200 | 200 | Check-in, weight trend, consistency, performance |
| `/reminders/settings` | 200 | 200 | Saved reminder flags, timezone, lead times |
| `/reminders/today` | 400 | 200 | Settings, occurrences, no-push-delivery message |
| `/activity-summaries` | 200 | 200 | Initially empty array |
| `/activity-summaries/today` | 200 | 200 | Goal, progress, primary source, sources, note |
| `/activity-summaries/history` | 200 | 200 | Initially empty; saved manual activity read back later |
| `/recipes` | 200 | 200 | 12 catalog entries |
| `/recipes/banana-date-soy-smoothie` | Not run | 200 | Serving, nutrition, allergens, ingredients, preparation |

### Writes and Authentication

| Method and path | Request exercised | Status and response |
| --- | --- | --- |
| `POST /auth/phone-login` | Supplied phone number | 201: token, `isNewUser: false`, user |
| `POST /auth/send-otp` | Supplied phone number | 503: SMS delivery not configured; invalid phone rejected with 400 |
| `POST /auth/verify-otp` | Invalid phone and malformed code | 400: validation messages; successful verification not tested |
| `PUT /onboarding` | Five draft saves, followed by complete six-step setup | 200 each: saved editable fields, final `completed: true` |
| `PUT /profile` | Existing name, goal, days, diet | 200: same profile values |
| `POST /meals` | `{ "meal": "QA test meal" }` | 201: date and meal |
| `POST /workouts` | `{ "exercises": [0], "durationMinutes": 1 }` | 201: date, exercises, duration |
| `PUT /workouts/today/progress` | Account's plan-day ID, exercise indexes and completed sets | 200: session and exercises; valid sets persisted; above-target bug noted above |
| `PUT /schedule/:id/meals` | `BREAKFAST` and a listed alternative recipe ID | 200: replaced meal; Vegetable Poha persisted |
| `PUT /schedule/:id/meals/BREAKFAST/eaten` | No body | 200: eaten meal; reflected in Today and Nutrition |
| `POST /progress/check-ins` | Date, weight 70 kg, waist 80 cm | 201: check-in and measurements; weight visible after read-back |
| `PUT /progress/settings` | `{ "checkInFrequencyDays": 14 }` | 200: saved settings; 14 read back |
| `POST /progress/performances` | Catalog exercise ID, date, 2 sets, 10 reps, 5 kg | 201: performance record; reflected in summary |
| `PUT /reminders/settings` | `{ "workoutEnabled": true }` | 200: saved settings; checked after refresh |
| `POST /activity-summaries` | Manual source, date, 1500 steps, 900 m, 50 active kcal, 10 minutes | 201: activity record; read back in Today and history |
| `PUT /activity-summaries/settings` | `{ "stepGoal": 8000 }` | 200: saved goal; activity response shows 19% progress |

### Failure Checks

- All 28 protected route patterns returned `401` without a bearer token, including reads and writes.
- Invalid phone numbers and malformed OTP code returned `400`.
- Invalid profile name type, meal type, negative workout duration, incomplete final onboarding, invalid check-in date/weight, invalid check-in frequency, malformed performance, invalid timezone, unlisted meal replacement, invalid activity data, invalid step goal, and `history?days=0` returned `400`.
- Unknown recipe and nonexistent schedule meal returned `404`.
- Above-target workout sets returned `200` incorrectly; the read-back established actual data corruption, not just a permissive status code. The workspace regression now expects rejection.
- Invalid-input checks intentionally generated HTTP errors in the browser console; these are separate from ordinary navigation failures.

## Browser Workflows

- Reproduced the initial post-login error on the supplied account.
- Opened Profile -> Update preferences and completed all six setup steps using live saves.
- Empty first-step fields triggered validation without proceeding.
- Closed and reopened the draft at Review; saved details and step were restored.
- Today populated after final setup save.
- Replaced and marked breakfast eaten; Nutrition showed its persisted completion.
- Logged sets using workout buttons; a fully completed exercise button became disabled.
- Calendar showed the saved three-day plan.
- Saved a check-in and fortnightly frequency; read back weight and frequency.
- Enabled workout reminders; verified the asynchronous save completed.
- Refreshed the page and verified session, meals, completed workout, and activity persisted.
- Desktop logout cleared the stored token. A subsequent real login returned `201` and loaded the dashboard without setup errors.
- Today, Workout, Nutrition, Calendar, Progress, and Profile rendered on mobile without horizontal document overflow or application alerts. Desktop and mobile screenshots were inspected. Requested viewports were 1440x900 and 390x844; host browser zoom yielded measured widths of 1152 and 312 CSS pixels.

## Persistent Test Data

Synthetic setup: age 28, male, 175 cm, 70 kg, build muscle, beginner, Monday/Wednesday/Sunday, 45-minute gym preference, dumbbells/machines, vegetarian/home cooked, 07:00 wake, flexible schedule, 18:00 workout, 23:00 sleep, lightly active.

The live account now contains the completed setup, generated plans, a replaced/eaten breakfast, completed planned workout, legacy QA meal and one-minute workout log, 70 kg / 80 cm check-in, exercise-performance sample, manual activity sample, 8000-step goal, fortnightly check-ins, and enabled workout reminders. These are synthetic QA records, not actual health observations. They were not deleted because this API does not expose cleanup endpoints. Only the deliberately excessive set count was restored.

## Workspace Verification

- Frontend API-client and readiness tests: 25 passed.
- Backend suite after the validation fix: 79 passed across 15 suites.
- Frontend `tsc --noEmit`: passed.
- Backend production TypeScript check: passed.
- Editor diagnostics for changed application/test files: no errors.

## Deployment and Limits

No commit, push, or deployment was performed. Deploy the frontend setup gate and backend set-limit validation, then retest the incomplete-user login/refresh and above-target rejection against Render. The browser checks above exercised the previously deployed code, not the new workspace fixes.

OTP delivery/verification success, mobile logout, cross-account isolation, load/concurrency, date rollover/timezone boundaries, alternate/minor setup paths, and nutritional adequacy were not fully validated. Push delivery is explicitly not implemented. Successful HTTP responses alone should not be interpreted as production readiness.