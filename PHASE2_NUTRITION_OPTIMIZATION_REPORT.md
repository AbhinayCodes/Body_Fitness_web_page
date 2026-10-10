# Phase 2 — Macro-Aware Nutrition & Meal Optimization Report

**Objective:** make the combined daily/weekly meal plan match *every* macro target (calories, protein, carbs, fat, fiber), not just calories — safely, with practical portions and real variety, and be honest when the catalog cannot.

Nothing was committed, pushed, or deployed. The live site still runs Phase 1 (verified: `/schedule` `nutritionSummary` on the deployed API has no `status` field). All results below are **locally** measured unless stated.

---

## 1. Root causes of the macro mismatch
- **Calorie-only portion scaling.** `SchedulePlannerService.recipeFor` picked the day-rotated recipe per slot and scaled servings purely by calories (`scaleServings(targetCalories, recipeCalories)`). No macro was considered, so the macro mix was whatever the rotated dishes happened to contain.
- **Variety-driven selection ignored macros.** The rotated top pick was taken verbatim; fat-dense (paneer/oil) and fiber-dense (legume) dishes were chosen without regard to the day's fat/carb/fiber targets → fat +23–46%, carbs under, fiber +50–100% on the live Phase 1 engine.
- **Success flag hid the drift.** `withinTolerance` only checked calories ≤10% and protein ≤15%, so plans with fat +46% reported `true`.

## 2. Architecture and files changed
Target calculation (`NutritionCalculationService`) is unchanged and remains the single authoritative source of targets. The change is entirely in **food selection + portioning + validation**.

**New**
- `backend/src/schedule/meal-optimizer.ts` — pure, deterministic macro optimizer.
- `backend/src/nutrition/recipe-nutrition.ts` — ingredient-level nutrition recomputation + macro-implied-calorie check.
- Specs: `meal-optimizer.spec.ts`, `nutrition-optimization.spec.ts`.

**Changed**
- `backend/src/schedule/schedule-planner.service.ts` — `generate` now builds a safe, rotated, preference-ordered pool per slot and delegates to `optimizeMealPlan`; `summarizeSchedule` now reports an explicit multi-macro status.
- `backend/src/schedule/schedule-planner.types.ts` — `ScheduleRecipe` gains `tags`/`regionalCuisines`; `DailyScheduleInput` gains `preferences`/`mealsPerDay`; `NutritionSummary` gains `status`, `macrosWithinTolerance`, `unmetTargets`.
- `backend/src/schedule/schedule.service.ts` — passes food preferences (likes/dislikes/cuisines/foodPreferences) and `mealsPerDay` from onboarding into the planner.
- `backend/prisma/recipe-catalog.seed.ts` — catalog expanded 34→46 recipes, 33→38 ingredients (exports added for tests).
- `backend/src/recipe/recipe-catalog.seed.spec.ts` — updated counts.
- `types/fitness.ts`, `components/Dashboard.tsx` — surface all five macro actuals + plan status.

## 3. Final meal-selection & optimization methodology
Deterministic, auditable, no randomness, no ML:
1. **Safety pre-filter (unchanged Phase 1).** Each slot's pool is filtered by `dietCompatible` + `recipeViolatesAllergens` before anything else. The optimizer only ever ranks already-safe recipes.
2. **Variety-first rotation.** Pools are rotated by day number (day-to-day/week-to-week variety) and preference-ordered (disliked dishes sink to the back). The initial pick is the rotated top, skipping any dish already used earlier that day.
3. **Joint serving optimization.** Coordinate descent over practical servings (0.5–3, step 0.25) across all slots minimises a weighted sum of squared relative macro deviations (weights: protein 1.3, calories/carb/fat 1.0, fiber 0.4 — documented & configurable).
4. **Tolerance-gated recipe swaps.** Only while the plan is still outside the documented tolerances does the optimizer swap a recipe — choosing, among safe window candidates, the one that **minimises out-of-tolerance macros**, then **maximises variety/preference**, then macro fit. So recipes change only when servings alone cannot meet targets, and still rotate across days.

**Tolerances (hard pass/fail per macro):** calories ±10%, protein ±15%, carbohydrate ±15%, fat ±20%, fiber ±25%. Diet/allergen rules are **hard constraints** enforced before optimization and never traded for macros.

## 4. Targets, ingredients, servings, and totals
- **Targets:** from `NutritionCalculationService` only (Mifflin–St Jeor + PAL + goal, with the Phase 1 BMR-floor / review safeguards).
- **Per-serving nutrition:** curated stored recipe values (what is displayed and persisted). Portion scaling multiplies *every* macro by servings, so calories and macros stay proportional.
- **Ingredient reconciliation (`recipe-nutrition.ts`):** recomputes nutrition from ingredient quantities (g/ml per-100). Used to (a) guard internal consistency and (b) flag recipes whose ingredient list is an unreliable calorie proxy — identified, never fabricated.
- **Final totals:** `summarizeSchedule` sums the *actual chosen portions* and compares each macro to target with difference + percentage.

## 5–7. Before / after (identical profiles, local)
Apples-to-apples on the **same expanded catalog**: Phase 1 algorithm (calorie-only, rotated[0]) vs Phase 2 optimizer. Format: `cal% / protein% / carb% / fat% / fiber% [status]`.

| Profile (targets) | BEFORE (calorie-only) | AFTER (macro-aware) |
|---|---|---|
| Veg · muscle (2920/120/464/65/41) | −2.2 / −10 / −2.6 / **0** / **+95.1** [USABLE] | −7.9 / −5.8 / −12.9 / +9.2 / **+39** [USABLE] |
| Non-veg · muscle | +1.2 / **+26.7** / −14.2 / **+18.5** / **+51.2** [NEEDS_REVIEW] | −8.1 / +10.8 / −10.8 / −9.2 / +24.4 [**MEETS_TARGETS**] |
| Vegan · muscle | −0.7 / +0.8 / −4.7 / **0** / **+97.6** [USABLE] | −8.3 / −6.7 / −8 / −15.4 / **+61** [USABLE] |
| Veg · fat loss (2420/113/357/60/34) | +3.7 / **−15.9** / +11.2 / −5 / **+108.8** [NEEDS_REVIEW] | −9 / +3.5 / −14.3 / **0** / **+20.6** [**MEETS_TARGETS**] |

**Live Phase 1 reference (deployed, from `NUTRITION_LIVE_VALIDATION_REPORT.md`):** veg muscle fat **+46.2%**, fiber +73.2%; non-veg fat +30.8%, protein +33.3%. Phase 2 brings fat within ±20% everywhere and roughly halves fiber overshoot.

**Takeaways:** fat is now controlled in every profile; protein drift shrinks (non-veg +26.7→+10.8, fat-loss −15.9→+3.5); fiber improves dramatically (≈+95→+39, +108→+21) and reaches tolerance for several profiles. Non-veg and fat-loss now fully `MEETS_TARGETS`. Calorie accuracy is traded slightly (to ≈−8/−9%, still within ±10%) to fix the other macros — a documented, deliberate trade-off.

## 8. Allergy & dietary-safety regression (local)
`nutrition-optimization.spec.ts` + `schedule-planner.service.spec.ts` assert, across all 7 week-days while optimizing:
- A `dairy` restriction yields **zero** `DAIRY` recipes; multiple restrictions all excluded.
- Eggetarian never selects chicken/fish; vegetarian excludes meat/fish/egg; vegan is fully vegan.
- The optimizer is proven to only rank already diet/allergen-safe pools (safety is a hard pre-filter).
All Phase 1 safety specs still pass unchanged.

## 9. Weekly variety & repeatability (local)
- ≥4 distinct breakfasts across a 7-day week for the demanding veg-muscle profile (variety preserved even under macro pressure); same day reloads byte-identical.
- Variety is only reduced when the catalog *forces* a macro swap, which is the documented, intended behaviour.

## 10. When the catalog cannot meet targets
Reported honestly, never hidden:
- **Status tiers:** `MEETS_TARGETS` (all 5 macros in tolerance) · `USABLE_WITH_DEVIATIONS` (calories+protein in tolerance; specific macros listed in `unmetTargets`) · `NEEDS_REVIEW` (calories or protein out of tolerance).
- A dedicated test feeds a tiny fat-dense catalog and asserts the engine does **not** claim `MEETS_TARGETS` and lists the unmet macros.
- Current real example: vegetarian/vegan **fiber** stays above +25% because the Indian veg/vegan catalog is inherently legume-heavy → correctly surfaced as `USABLE_WITH_DEVIATIONS` with `fiberGrams` in `unmetTargets`, shown in the UI.

## 11. Commands, results, build/typecheck
| Gate | Command | Result |
|---|---|---|
| Backend tests | `npm --prefix backend test -- --runInBand` | **368 passed / 368** (31 suites) |
| New optimization suites | same, filtered | meal-optimizer (8), nutrition-optimization (16+), planner (updated) all pass |
| Backend prod typecheck | `tsc --project backend/tsconfig.build.json --noEmit` | ✅ clean |
| Frontend tests | `node --test lib/api.test.cjs` | ✅ 28/28 |
| Frontend build | `next build` | ✅ compiled + typechecked |
| Prisma | n/a | **No schema change → no migration/generate required** |

## 12. Remaining limitations & future work
- **Vegetarian/vegan fiber** typically exceeds +25% (catalog-inherent); honestly flagged, not hidden. Future: add more low-fiber veg protein/carb options.
- **Calorie accuracy** gives up a few percent (≈−8/−9%) to satisfy other macros; could be tuned via weights if preferred.
- **Ingredient reconciliation** flags two legacy recipes (`vegetable-poha`, `sprouts-chaat`) whose ingredient lists are unreliable calorie proxies (water absorption / unlisted aromatics). Internal macro consistency still holds; documented.
- **No micronutrients** beyond fiber (catalog has none) — explicitly out of scope, not fabricated.
- **Observation (Phase 1, live, not Phase 2):** `/today` returned HTTP 500 for a synthetic account left in the extreme `NEEDS_REVIEW` nutrition state from Phase 1 live testing; a clean profile works. Worth a follow-up on the live Phase 1 `NEEDS_REVIEW` → `/today` path.

## 13. Migration / deployment
- **No Prisma schema change, no migration.** The catalog expansion is seed data; Render's existing `prisma db seed` on deploy upserts the 12 new recipes/5 new ingredients idempotently.
- Deployment is **code + seed** only. Not performed — awaiting your review.

## Local vs live
- **Locally verified:** everything above (unit + integration via the real service path, typecheck, frontend build).
- **Not yet live:** these changes are undeployed; the deployed site still runs the Phase 1 calorie-only engine (confirmed via the deployed API). Live confirmation of the macro-aware behaviour requires deploying and re-running the deployed-origin checks.
