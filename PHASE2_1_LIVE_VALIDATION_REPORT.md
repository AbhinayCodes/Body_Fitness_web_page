# Phase 2.1 — Live Validation Report

**Target:** https://body-fitness-web-page.onrender.com/ (frontend) → Next.js `/api/v1` rewrite → `formwell-api.onrender.com` → Postgres.
**Date:** 2026-10-11.
**Method:** Browser automation from the deployed frontend origin (`page.evaluate` → `fetch('/api/v1/...')`) — the real UI→API path. One account rendered in the live UI for visual confirmation.
**Accounts:** authorized synthetic QA numbers `91000000 51–54` (phone-login, no OTP — pre-existing limitation). Synthetic data, not real health records.

## VERDICT: Phase 2.1 is LIVE and working on the deployed site. ✅

Deployment confirmed on the live API: the new recipes **Tofu Fried Rice, Tofu Bhurji with Rice, Soya Chunk Fried Rice, Rava Upma, Egg Curry with Rice** appear in generated plans; the corrected **Vegetable Poha reads 480 kcal** live; and the **four-meal default is active** (plans ≥2600 kcal now return 4 meals).

---

## 1. Macro accuracy & fiber (live `/today`, rest day)
Format: cal% / protein% / carb% / fat% / **fiber%** — status; meals; max serving.

| Profile (muscle 2920 unless noted) | Result |
|---|---|
| Vegetarian | −3.5 / −12.5 / −3.4 / +9.2 / **+17.1** — **MEETS_TARGETS**; 4 meals; max 2.5× |
| Vegan | −4.2 / −15 / −3.9 / +10.8 / **+14.6** — **MEETS_TARGETS**; 4 meals; max 2.75× |
| Eggetarian | −3.4 / −12.5 / −8.8 / +15.4 / **+12.2** — **MEETS_TARGETS**; 4 meals; max 2.25× |
| Non-vegetarian | −8.9 / −12.5 / −14.7 / +10.8 / **+29.3** — USABLE_WITH_DEVIATIONS (fiber); 4 meals; max 3× |
| Vegetarian · fat loss (2420) | −9 / +3.5 / −14.3 / 0 / **+20.6** — MEETS_TARGETS; 3 meals; max 2× |
| Female · fat loss · non-veg (1340) | −1.6 / −13.8 / −5.5 / +10.9 / **+15.8** — MEETS_TARGETS; 3 meals; max 1.5× |
| Heavy very-active · veg (3570) | −1.4 / −13.8 / −0.9 / +6.3 / **+20** — MEETS_TARGETS; 4 meals; max 3× |

**6 of 7 profiles now `MEETS_TARGETS`; none `NEEDS_REVIEW`.** Fiber is within tolerance everywhere except one non-veg rotation (+29.3%, honestly `USABLE_WITH_DEVIATIONS`). Protein sits −12 to −15% on several (within the 15% tolerance) — a small, honest trade to control fiber/fat.

### Before → after (both measured live)
| Profile | Phase 2 (before) | Phase 2.1 (after) |
|---|---|---|
| Vegetarian muscle | fiber **+39%**, USABLE, 3 meals, 3× | fiber **+17.1%**, **MEETS**, 4 meals, 2.5× |
| Vegan muscle | fiber **+56.1%**, USABLE, 3 meals | fiber **+14.6%**, **MEETS**, 4 meals, 2.75× |
| Eggetarian muscle | fiber +43.9%, USABLE | fiber +12.2%, **MEETS** |

## 2. Gluten policy (live)
- Gluten-free **vegan** week: **0** GLUTEN recipes, **0** oats recipes (all oats now excluded for GF). 25 meals generated.
- Lowercase `gluten` **vegetarian** week: 0 GLUTEN recipes.
- Replacement on a gluten-restricted plan returned a gluten-safe dish (**Idli with Sambar**); a non-listed recipe id was rejected (400). Gluten cannot be bypassed by selection or replacement.

## 3. Allergy & diet safety (live `/schedule/week`)
| Check | Result |
|---|---|
| `dairy` restriction | no DAIRY ✅ |
| `dairy+gluten+fish` | none present ✅ |
| Eggetarian | egg reachable (incl. new **Egg Curry with Rice**, Egg Veg Pulao, Boiled Egg), **no fish/meat** ✅ |
| Vegan | 100% vegan ✅ |
| Vegetarian | no non-veg, **no egg** ✅ |

## 4. Corrected recipes (live)
- **Vegetable Poha** now reads **480 kcal** (was 330; corrected to match its ingredients).
- New **Tofu Bhurji with Rice**, **Tofu Fried Rice**, **Soya Chunk Fried Rice**, **Rava Upma**, **Egg Curry with Rice** all selected in live plans.
- Hung-curd and cooked-moong-dal reference corrections are deployed via the re-seeded catalog.

## 5. Dinner variety & serving practicality (live)
- **Max single-dish serving dropped** from Phase 2's 3× to ~2.25–2.75× for most profiles (the 4-meal default spreads the load; the ~1.3 kg single lunch is gone). A couple of very-high-calorie profiles still reach 3×.
- **Dinner variety over a realistic training week:** Non-vegetarian **4**, Vegetarian **3**, Vegan **3** distinct dinners. Note: with 3 training days (Mon/Wed/Fri), only the 4 rest days carry a dinner slot (training days use post-workout meals), so the weekly dinner *count* is ~4 — fewer occasions than the all-rest-day local test (which showed 5 for vegetarian). Within that, variety is near the maximum possible.

## 6. Caching & Phase 1 safety regressions (live)
| Check | Result |
|---|---|
| Same inputs → same schedule id | ✅ cache hit |
| Changed restriction → new id | ✅ cache bust |
| Replace with listed alternative | ✅ 200, gluten-safe (Idli) |
| Replace with non-listed recipe | ✅ 400 |
| Doctor diet restriction | ✅ MEDICAL_REFERRAL |
| Under-18 nutrition | ✅ UNDER_18 |
| Under-18 workout | ✅ requiresYouthReview, not persisted |
| Impossible measurements | ✅ NEEDS_REVIEW |

## 7. Live UI
Vegan account dashboard (rest day, 4 meals):
> Meals completed 0 / **4** · Planned meals provide **2,798 kcal / 102g protein / 446g carbs / 72g fat / 47g fiber**
> BREAKFAST Dosa ×1.75 · LUNCH Lemon Chickpea Rice ×2.75 · **SNACK Roasted Chana and Almonds ×0.5** · DINNER **Tofu Bhurji with Rice** ×2

Four meals, all five macro actuals shown, fiber 47 g (+14.6%), **no deviation note** (MEETS_TARGETS). Screenshot captured.

## 8. Remaining limitations (confirmed live)
- **Vegan/vegetarian dinner variety** is ~3 over a training week (fewer dinner occasions + macro-constrained vegan dinners). The chosen dinners are low-fiber tofu/soya dishes — a quality improvement over the prior legume repetition.
- **Occasional fiber overshoot** on specific rotations (e.g. non-veg +29.3% this day) — honestly reported as `USABLE_WITH_DEVIATIONS`.
- **Protein** runs slightly low (−12 to −15%, within tolerance) on some muscle profiles as the optimizer balances fiber/fat.

## 9. Local vs live
- **Locally verified earlier:** 382/382 backend tests, backend prod typecheck, 28/28 frontend tests, `next build`.
- **Live-verified now (this report):** deployment of the new recipes + corrections + 4-meal default; macro/fiber accuracy across 7 profiles; gluten policy and gluten-restriction safety; allergy/diet safety; corrected poha; caching/replacement; all Phase 1 safety states; and the live 4-meal UI. The fiber overshoot from the follow-up audit is confirmed substantially fixed on the live site (vegan +56%→+14.6%), with honest reporting where the catalog still can't fully comply.
