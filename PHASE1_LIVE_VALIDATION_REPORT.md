# Phase 1 — Live Validation Report

**Target:** https://body-fitness-web-page.onrender.com/ (frontend) → Next.js `/api/v1` rewrite → `formwell-api.onrender.com` (backend) → Postgres.
**Date:** 2026-10-10.
**Method:** Browser automation from the deployed frontend's own origin (`page.evaluate` → `fetch('/api/v1/...')`), i.e. the exact path the UI uses. Each scenario logs in, saves onboarding, and reads the live `/nutrition/targets`, `/schedule/*`, and `/workouts/plan` responses. One account was also rendered in the live UI for visual confirmation.
**Accounts:** authorized synthetic QA numbers `91000000 11–15` (phone-login issues a JWT without OTP — a pre-existing security limitation, out of scope). These accounts persist synthetic data; do not treat as real health records.

## VERDICT: all Phase 1 fixes are LIVE and behave correctly on the deployed site. ✅

Deployment confirmed by new behaviours that did not exist before: `MEDICAL_REFERRAL` with `reasons`, `NEEDS_REVIEW`, `caloriesFlooredToBasal`, `Eggetarian` accepted by the save DTO (HTTP 200), and `requiresYouthReview` on the workout plan.

---

## 1. Nutrition calculation safeguards + medical referral + under‑18 (acct …11, `/nutrition/targets`)

| Scenario (input)                                              | Result                                      | Evidence                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Normal (M/25/180/75, build muscle, moderate)                  | `READY`                                   | 2,920 kcal · P120 · C464 · F65 · fib41. Macro sum 120·4+464·4+65·9 =**2,921 ≈ 2,920** (internally consistent) |
| Doctor restricted diet (`doctorDietRestrictions: yes`)      | `MEDICAL_REFERRAL`                        | reason: "A doctor has restricted your diet."                                                                                |
| Diabetes (`healthConditions: [diabetes]`)                   | `MEDICAL_REFERRAL`                        | reason: "…(diabetes) needs individualised nutrition guidance."                                                             |
| Asthma (`healthConditions: [asthma]`)                       | `READY`                                   | normal plan — no over‑referral                                                                                            |
| Under‑18 (age 16)                                            | `UNDER_18`                                | no targets returned                                                                                                         |
| Impossible (M/60/**100 cm/350 kg**/sedentary/fat‑loss) | `NEEDS_REVIEW`                            | reason: implausible/inconsistent; BMR 3,830. No clamped plan emitted                                                        |
| BMR floor (F/30/150/45/sedentary/fat‑loss)                   | `READY`, `caloriesFlooredToBasal: true` | calories**1,080 ≥ BMR 1,077**; macros 68·4+121·4+36·9 = 1,080 (consistent, all non‑negative)                     |

---

## 2. Allergy normalization + diet correctness (accts …12/…13, `/schedule/week`, 24 meals/week)

| Scenario                                    | Dairy present? | Gluten       | Fish         | Result           |
| ------------------------------------------- | -------------- | ------------ | ------------ | ---------------- |
| `foodRestrictions: ["dairy"]` (lowercase) | **No**   | yes          | yes          | ✅ F1 fixed live |
| `["DAIRY"]` (uppercase control)           | No             | yes          | yes          | ✅               |
| `["Dairy-free"]` (UI chip)                | No             | yes          | yes          | ✅               |
| `["lactose"]` (synonym)                   | No             | yes          | yes          | ✅               |
| `["dairy","gluten","fish"]` (multiple)    | No             | **No** | **No** | ✅ all excluded  |

**Before fix (reproduced in `NUTRITION_FAILURE_REPORT.md`):** lowercase `"dairy"` leaked Paneer `[DAIRY]`. **Now:** zero dairy recipes across the whole week for every case.

| Diet                                 | Result                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Eggetarian** (save HTTP 200) | Egg dish reachable (Masala Omelette), every non‑veg meal carries the`EGG` tag, **no chicken, no fish** ✅ |
| Vegan                                | 100% vegan meals ✅                                                                                                |
| Vegetarian                           | no non‑veg meals,**no egg** ✅                                                                              |

(Eggetarian previously impossible — it was mapped to Vegetarian and the DTO rejected the value.)

---

## 3. Workout age + safety gates (acct …14, `/workouts/plan`)

| Scenario                                                          | Result                                                                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adult (25)                                                        | Persisted plan,`id` present, 3 days / 15 exercises (Barbell Back Squat, …)                                                                        |
| **Under‑18 (16)**                                          | `requiresYouthReview: true`, `requiresMedicalClearance: true`, **no `id`, 0 days, 0 exercises**, youth‑guidance notice ✅               |
| Under‑18 boundary (17)                                           | same restricted outcome ✅                                                                                                                           |
| Adult boundary (18)                                               | normal plan generated ✅                                                                                                                             |
| Doctor exercise restriction (`doctorExerciseRestrictions: yes`) | `requiresMedicalClearance: true`, 0 prescribed exercises, gentle‑movement notice ✅                                                               |
| Knee injury (`injuryAreas: [knee]`)                             | Plan generates and**differs from the control**: `Barbell Back Squat` → `Bodyweight Squat` (knee‑load swap), injury enforcement intact ✅ |

---

## 4. Caching + alternative/replacement safety (acct …15, `/schedule/today`)

- **Cache hit:** two reads with identical inputs returned the **same** schedule id. ✅
- **Cache bust on change:** after changing `foodRestrictions` the schedule id changed (`d8de4217…` → `f629864f…`). ✅
- **Dairy‑restricted plan:** 0 dairy meals. ✅
- **Replacement safety:** swapping a meal to a listed alternative succeeded (HTTP 200) and the new recipe (Masala Omelette `[EGG,GLUTEN]`) was **dairy‑safe**; a non‑listed recipe id was **rejected (HTTP 400)**. ✅

**Live UI render (acct …15, Saturday rest day, dairy restriction):** dashboard shows Masala Omelette, Dal Rice with Vegetables, Fish Curry with Rice — **no paneer/curd/milk dish** — with portion scaling and "Planned meals provide 2,960 kcal / 159 g protein". Screenshot captured.

---

## 5. Not failures / notes

- Macro drift (F2) remains **out of scope** for Phase 1 (portion engine still scales by calories only).
- Non‑allergen restrictions (Jain/Halal/Kosher/Low‑carb) are acknowledged as `unsupported` at the API layer but have no dedicated UI surface yet.
- Alternative recipes could not be inspected for allergens directly via `/schedule/week` (IDs only); verified instead through the live `replaceMeal` round‑trip above and backend unit tests.

## 6. Locally verified vs live verified

- **Previously (local):** 342/343 backend tests, backend prod typecheck, frontend tests + `next build`.
- **Now (live, deployed):** every Phase 1 scenario above was confirmed through the real deployed UI→API path — allergy normalization, eggetarian, diet correctness, nutrition safeguards, medical referral, under‑18 nutrition **and** workout, injury/doctor enforcement, and caching/replacement safety. The headline F1 safety bug is confirmed fixed on the live site.
