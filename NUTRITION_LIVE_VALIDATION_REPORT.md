# Nutrition Engine — Live Validation Report

**Target site:** https://body-fitness-web-page.onrender.com/ (frontend) + https://formwell-api.onrender.com (API)
**Date:** 2026-10-04
**Test account:** phone `9100000007` (authorized synthetic QA account; phone-login issues a JWT without OTP — a pre-existing security limitation, not part of this task).
**Method:** Browser automation from the deployed frontend's own origin (`page.evaluate` → `fetch('/api/v1/...')`), i.e. the exact path the UI uses: **browser → Next.js `/api/v1` rewrite → deployed backend engine → Postgres → API → UI render**. The final dashboard render was captured from the live DOM.

## VERDICT: the new nutrition engine IS LIVE AND WORKING on the deployed website.

Confirmed by three independent signals:
1. **Deployed frontend bundle** contains the new markers `Planned meals provide` and `kcal planned`, and **no** old `kcal / serving` marker.
2. **Deployed backend** serves the new `GET /api/v1/schedule/week` route (401 with no token; the old build returned 404).
3. **Live DOM render** of the dashboard shows portion-scaled meals and a target-vs-actual line (screenshot-equivalent snapshot below), not the old fixed single-serving list.

The headline bug is fixed live: **target 2,920 kcal now produces ~2,940 kcal of actual food (+0.7%)**, versus the old ~1,410 kcal (−52%).

---

## Deployment steps performed
1–7. Pre-deploy gates (backend 290 tests/26 suites, prod typecheck 0, prisma generate, frontend 28 tests + `next build`, migration `20260915000014_meal_portion_scaling` present, expanded catalog present) — all green.
8–9. Changes committed (`bb872b6 "meal plan correction 1"`) and pushed to `origin/master` on GitHub.
10. Render auto-deployed both services (backend + frontend) — verified live by route + bundle markers.
11–12. Render `startCommand` runs `prisma migrate deploy` **and** `prisma db seed` on every deploy, so migration 14 and the expanded 34-recipe catalog (idempotent upserts) were applied automatically in production. No manual DB step required by this architecture.

---

## TEST PROFILE 1 — 25 / Male / 180 cm / 75 kg / Muscle gain / Intermediate / 4 training days / Moderate / Vegetarian
**Day tested was a rest day (Saturday), so 3 meals.**

**Targets (live):** 2,920 kcal · Protein 120 g · Carbs 464 g · Fat 65 g · Fiber 41 g
**Audit chain (live metadata):** BMR 1,755 → ×1.55 (self-reported moderate) → TDEE 2,720 → +200 goal adjustment → **2,920 recommended intake**.

| Meal | Dish | Portion | kcal | Protein | Carbs | Fat | Fiber |
|---|---|---|---|---|---|---|---|
| Breakfast | Besan Chilla | ×3 | 900 | 45 | 114 | 27 | 21 |
| Lunch | Chole with Roti | ×2 | 1000 | 40 | 164 | 20 | 32 |
| Dinner | Palak Paneer with Roti | ×2 | 1040 | 52 | 100 | 48 | 18 |
| **Daily actual** | | | **2,940** | **137** | **378** | **95** | **71** |

**Target vs actual:** cal **+0.7%** · protein **+14.2%** · carbs **−18.5%** · fat **+46.2%** · fiber **+73.2%**. `withinTolerance=true` (flag measures calories ≤10% and protein ≤15% only — see Failure Report for the fat/carb drift).

**Live UI render (dashboard DOM):**
> Calorie target **2,920 kcal** · Planned meals provide **2,940 kcal / 137g protein**
> BREAKFAST Besan Chilla — **900 kcal / 3 servings / 45g protein**
> LUNCH Chole with Roti — **1000 kcal / 2 servings / 40g protein**
> DINNER Palak Paneer with Roti — **1040 kcal / 2 servings / 52g protein**

## TEST PROFILE 2 — same, Fat loss
**Targets:** 2,420 kcal (−500 vs muscle; goal adjustment −300) · P 113 · C 357 · F 60 · fib 34.
Meals: Besan Chilla ×2.5 (750) · Chole with Roti ×1.75 (875) · Palak Paneer ×1.5 (780).
**Actual:** 2,405 kcal **(−0.6%)** · P 112 (−0.9%) · C 314 (−12%) · F 76 (+26.7%) · fib 59 (+73.5%).
✅ Calories dropped correctly and portions shrank (3→2.5, 2→1.75, 2→1.5).

## TEST PROFILE 3 — same, 90 kg
**Targets:** 3,150 kcal (+230) · **P 144** (up from 120) · C 482 · F 72 · fib 44.
Meals: Besan Chilla ×3 (900) · Chole with Roti ×2.25 (1125) · Palak Paneer ×2 (1040).
**Actual:** 3,065 kcal **(−2.7%)** · P 142 (−1.4%) · C 399 (−17.2%) · F 98 (+36.1%) · fib 75 (+70.5%).
✅ Calories, protein target, and portions all increased with body weight.

## TEST PROFILE 4 — same, Sedentary
**Targets:** 2,310 kcal (×1.20 instead of ×1.55) · P 120 · C 323 · F 60 · fib 32.
Meals: Besan Chilla ×2.25 (675) · Chole with Roti ×1.75 (875) · Palak Paneer ×1.5 (780).
**Actual:** 2,330 kcal **(+0.9%)** · P 108 (−10%) · C 304 (−5.9%) · F 74 (+23.3%) · fib 57 (+78.1%).
✅ Lower activity → lower calories and smaller portions.

---

## DIET TESTS (actual displayed meals, live)
| Diet | Breakfast | Lunch | Dinner | Prohibited foods present? |
|---|---|---|---|---|
| Vegetarian | Besan Chilla (VEGAN) | Chole with Roti (VEGAN) | Palak Paneer (VEGETARIAN) | None (no meat/fish) ✅ |
| Vegan | Vegetable Poha (VEGAN) | Rajma Chawal (VEGAN) | Tofu Veg Stir Fry (VEGAN) | None (no dairy/egg/meat) ✅ |
| Non-vegetarian | Dosa w/ Chutney (VEGAN) | Paneer Veg Rice Bowl (VEG) | Grilled Chicken + Sweet Potato (NON-VEG) | Allowed meat present ✅ |

**Eggetarian:** NOT an option in the deployed app. The real diet enum is `Vegetarian / Non-vegetarian / Vegan / No preference` only. Reported as unsupported rather than faked.

---

## ALLERGY TEST (Non-vegetarian + dairy restriction)
| Input | Breakfast | Lunch | Dinner | Dairy present? | Result |
|---|---|---|---|---|---|
| `["DAIRY"]` (uppercase) | Idli+Sambar | Chicken Curry w/ Roti | Egg Bhurji w/ Roti | No dairy-tagged recipe | ✅ PASS |
| `["dairy"]` (lowercase) | Dosa w/ Chutney | **Paneer Veg Rice Bowl [DAIRY]** | Grilled Chicken | **Paneer (DAIRY) shown** | ❌ FAIL |

The allergen filter is **case-sensitive** against uppercase tokens, so lowercase free-text is silently ignored. See `NUTRITION_FAILURE_REPORT.md` — this is the top (safety) finding.

---

## WEEKLY TEST (week starting Monday 2026-09-28)
**Same-week stability:** loaded the week endpoint twice → `reloadIdentical = true`. The plan does **not** change on reload. ✅ (not random per load)

| Date | Day | kcal | Breakfast | Lunch | Dinner/evening |
|---|---|---|---|---|---|
| 09-28 | Train | 2918 | Moong Dal Chilla ×2.75 | Dal Rice w/ Veg ×2 | (pre/post-workout meals) |
| 09-29 | Train | 2975 | Paneer Paratha ×2 | Paneer Veg Rice Bowl ×1.75 | (pre/post-workout meals) |
| 09-30 | Rest | 2880 | Vegetable Oats Upma ×2.75 | Rajma Chawal ×2 | Tofu Veg Stir Fry ×2 |
| 10-01 | Train | 2900 | Vegetable Poha ×2.5 | Soya Chunk Curry w/ Rice ×1.75 | (pre/post-workout meals) |
| 10-02 | Train | 2950 | Banana Almond Oats Bowl ×2.25 | Vegetable Pulao w/ Raita ×2 | (pre/post-workout meals) |
| 10-03 | Rest | 2940 | Besan Chilla ×3 | Chole with Roti ×2 | Palak Paneer w/ Roti ×2 |
| 10-04 | Rest | 3020 | Dosa w/ Coconut Chutney ×2.75 | Dal Rice w/ Veg ×2.25 | Paneer Bhurji w/ Roti ×2 |

**Variety:** 7 **distinct** breakfasts (zero repeats). Lunches 6 unique (Dal Rice repeats Mon & Sun). Rest-day dinners all unique (Tofu / Palak Paneer / Paneer Bhurji). Calories 2,880–3,020 every day (all within ~3.5% of 2,920).
**Training days** correctly swap the DINNER slot for pre/post-workout meals (gym 18:00), so a 20:30 dinner is spacing-filtered out.

**Week 1 vs Week 2:** The live `/schedule/week` endpoint serves **only the current week** (no date parameter — and I deliberately did not add one, per "no further changes"). Week-to-week variation is therefore verified two ways rather than by fetching a second live week:
- The **within-week rotation** above (7 different daily selections) is the *same* deterministic `dayNumber` rotation that drives week-to-week change (next week's Monday = this Monday's `dayNumber + 7`, landing on a different pool index).
- The backend unit test asserts `nextMonday (dayNumber+7) !== monday` while targets stay identical.

This is an honest limitation of what the current live endpoint exposes — see Limitations.

---

## CALORIE & MACRO VALIDATION SUMMARY
All 7 scenarios landed calories within **±4.7%** (best 0.4%, worst 4.7%). Protein ranged −15.8% to +41.7%. **Fat and carbs drift materially** (fat +23% to +46%, carbs −6% to −23%) — reported separately and NOT hidden behind the calorie tolerance (see Failure Report).

## FAILURES
See `NUTRITION_FAILURE_REPORT.md`.

## LIMITATIONS
- **Portion engine scales by calories only.** Macro composition (fat/carb split) is a consequence of which dishes are chosen, not optimized. Indian vegetarian dishes here are fat- and fiber-dense, and the carb target (464 g, from the carb-remainder formula) is high, so calorie-correct plans overshoot fat/fiber and undershoot carbs.
- **No micronutrients beyond fiber** (ingredient table has no micronutrient columns). Not fabricated.
- **Live `/week` serves the current week only;** Week 2 verified by deterministic design + unit test, not a second live fetch.
- **Eggetarian** is not a diet option in the deployed app.
- **Phone-login requires no OTP** (pre-existing security limitation, out of scope).
