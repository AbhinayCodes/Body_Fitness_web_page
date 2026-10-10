# Phase 2 — Live Validation Report (Macro-Aware Meal Optimization)

**Target:** https://body-fitness-web-page.onrender.com/ (frontend) → Next.js `/api/v1` rewrite → `formwell-api.onrender.com` → Postgres.
**Date:** 2026-10-10.
**Method:** Browser automation from the deployed frontend origin (`page.evaluate` → `fetch('/api/v1/...')`) — the exact path the UI uses. One account was rendered in the live UI for visual confirmation.
**Accounts:** authorized synthetic QA numbers `91000000 31–34` (phone-login issues a JWT without OTP — pre-existing limitation). These hold synthetic data; not real health records.

## VERDICT: Phase 2 is LIVE and working on the deployed site. ✅

Deployment confirmed: the deployed `/today` `nutritionSummary` now carries the new Phase 2 fields `status`, `macrosWithinTolerance`, and `unmetTargets` (absent on the previous build). The live UI shows the full five-macro breakdown and an honest deviation note.

---

## 1. Macro accuracy across profiles & diets (live `/today`, rest day = 3 meals)
Format: target% deviation. `ok` = within tolerance (cal 10 / protein 15 / carb 15 / fat 20 / fiber 25).

| Profile (targets) | Status | cal% | protein% | carb% | fat% | fiber% | Unmet |
|---|---|---|---|---|---|---|---|
| Veg · muscle (2920/120/464/65/41) | USABLE_WITH_DEVIATIONS | −7 | −8.3 | −10.1 | **+6.2** | +39 | fiber |
| Non-veg · muscle | **MEETS_TARGETS** | −7 | −5.8 | −13.8 | +12.3 | +19.5 | — |
| Vegan · muscle | USABLE_WITH_DEVIATIONS | −7.6 | −5.8 | −8.6 | −9.2 | +56.1 | fiber |
| Eggetarian · muscle | USABLE_WITH_DEVIATIONS | −7 | −3.3 | −13.6 | **−1.5** | +43.9 | fiber |
| Veg · fat loss (2420/113/357/60/34) | **MEETS_TARGETS** | −9 | +3.5 | −14.3 | **0** | +20.6 | — |
| Female · fat loss · non-veg (1340/87/145/46/19) | **MEETS_TARGETS** | −2.6 | +5.7 | −7.6 | −4.3 | +5.3 | — |
| Heavy very-active · veg (3570/152/563/79/50) | USABLE_WITH_DEVIATIONS | −7.6 | −11.8 | −11.5 | +12.7 | +34 | fiber |

**Fat is now controlled in every profile** (−9% … +12.7%), versus the deployed Phase 1 engine which showed fat **+46.2%** (veg muscle) and **+30.8%** (non-veg). Calories and protein are within tolerance everywhere. The **only** recurring unmet macro is **fiber for vegetarian/vegan** plans — an inherent property of the legume-heavy Indian veg/vegan catalog — and it is reported honestly (`USABLE_WITH_DEVIATIONS`, `unmetTargets: ["fiberGrams"]`), never hidden.

**Honesty check (live):** `MEETS_TARGETS` was returned only when every macro was within tolerance (`unmetTargets: []`); otherwise `USABLE_WITH_DEVIATIONS` with the specific macro listed. No plan reported success on calories/protein alone.

**Before → after (deployed):** e.g. veg muscle fat +46%→+6%, fiber +73%→+39%; non-veg muscle protein +33%→−6%, fat +31%→+12% (now MEETS_TARGETS). (Phase 1 used a smaller catalog, so the comparison is directional.)

---

## 2. Safety never sacrificed for macros (live `/schedule/week`, 24 meals)
| Check | Result |
|---|---|
| `foodRestrictions: ["dairy"]` (lowercase) | **No DAIRY** across the week ✅ |
| `["dairy","gluten","fish"]` | dairy/gluten/fish **all excluded** ✅ |
| Eggetarian | egg reachable (Egg Bhurji, Egg Veg Pulao), every non-veg meal carries `EGG`, **no fish, no chicken** ✅ |
| Vegan | 100% vegan ✅ |
| Vegetarian | no non-veg, **no egg** ✅ |

## 3. Weekly variety & stability (live)
- **5 distinct** vegetarian breakfasts across the week (incl. new recipes e.g. Greek Yogurt Fruit Bowl), despite macro optimization.
- Same-day reload is byte-identical; changing a restriction produces a new plan (see caching).

## 4. Caching, replacement & Phase 1 safety regressions (live)
| Check | Result |
|---|---|
| Same inputs → same schedule id | ✅ cache hit |
| Changed restriction → new schedule id | ✅ cache bust |
| Dairy-restricted plan | ✅ no DAIRY |
| Replace with listed alternative | ✅ 200, dairy-safe (Besan Chilla) |
| Replace with non-listed recipe | ✅ rejected (400) |
| Doctor diet restriction | ✅ `MEDICAL_REFERRAL` |
| Under-18 nutrition | ✅ `UNDER_18` |
| Under-18 workout | ✅ `requiresYouthReview`, not persisted |
| Impossible body measurements | ✅ `NEEDS_REVIEW` |

All Phase 1 safety behaviour remains intact after the Phase 2 changes.

## 5. Live UI (rendered)
Veg-muscle account dashboard shows:
> Planned meals provide **2,715 kcal / 110g protein / 417g carbs / 69g fat / 57g fiber**
> *"Calories and protein are on target; these macros are outside the usual range given the available recipes: fiber."*

The UI now exposes all five macro actuals vs target and the honest deviation message. Screenshot captured.

---

## 6. Remaining limitations (confirmed live)
- **Vegetarian/vegan fiber** runs +34–56% over target (catalog-inherent); surfaced as `USABLE_WITH_DEVIATIONS`, not hidden.
- **Calorie accuracy** is traded a few percent (≈−7/−9%) to fix the other macros — still within ±10%.
- **No micronutrients** beyond fiber (catalog has none) — out of scope, not fabricated.

## 7. Local vs live
- **Locally verified earlier:** 368/368 backend tests, backend prod typecheck, 28/28 frontend tests, `next build`.
- **Live-verified now (this report):** macro accuracy across 7 profiles/diets, allergy & diet safety across the week, eggetarian egg-reachability, weekly variety, caching/replacement safety, all Phase 1 safety states, and the new UI — all through the real deployed UI→API path. The headline fat-overshoot bug (F2) is confirmed fixed on the live site, and catalog limits (fiber) are reported honestly.
