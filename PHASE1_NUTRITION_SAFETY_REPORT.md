# Phase 1 — Nutrition Safety and Correctness Fixes

**Scope:** nutrition allergy/diet safety, nutrition calculation safeguards, medical nutrition referral wiring, and under‑18 workout safety. No homepage/UI redesign, no macro‑optimization redesign, no weekly‑coverage redesign, no LLM, no data reset, **no schema change**, nothing committed/pushed/deployed.

> Note: the referenced `ENGINE_ARCHITECTURE_AUDIT.md` was not present in the workspace. The concrete, reproduced findings used here come from `NUTRITION_FAILURE_REPORT.md`, `NUTRITION_LIVE_VALIDATION_REPORT.md`, and prior repository notes. Each production execution path was re‑traced before editing.

---

## 1. Root cause of each issue

1. **Allergy filter was case/format‑sensitive (F1, safety).** `schedule-planner.service.ts` filtered with `!recipe.allergens.some(a => input.restrictions.includes(a))`. Recipe allergen tokens are uppercase (`DAIRY`, `GLUTEN`, …) while user restrictions arrive as UI chips (`Dairy-free`) or free text (`dairy`, `lactose`, `peanuts`). Any non‑exact‑uppercase token never matched, so a dairy‑restricted user could be served Paneer `[DAIRY]`.
2. **Eggetarian was silently downgraded to vegetarian.** `lib/onboarding/engine.ts` mapped `eggetarian → 'Vegetarian'`, and the backend DTO did not accept `Eggetarian`. Egg dishes in the catalog are tagged `NON_VEGETARIAN`, so an eggetarian never received eggs.
3. **Nutrition calculation could emit implausible/inconsistent targets.** Calories had no lower bound (a fat‑loss deficit could fall below BMR, or near zero for extreme accepted measurements), and carbohydrates were clamped with `Math.max(0, …)` — hiding an impossible macro combination (protein+fat kcal exceeding the calorie budget) behind a "0 g carbs" plan whose macros no longer summed to the stated calories.
4. **`requiresMedicalNutritionSupport` was never populated.** The calculator supported a `MEDICAL_REFERRAL` branch, but `nutrition.service.ts` never read health answers, so doctor‑imposed diet restrictions and nutrition‑sensitive conditions silently received a normal plan.
5. **No age gate on the workout path.** Nutrition had an `UNDER_18` branch, but `workout-plan.service.ts` generated and persisted the standard adult plan for minors.

---

## 2. Files changed and why

### New
- **`backend/src/nutrition/dietary-safety.ts`** — pure canonical safety layer: `normalizeRestrictions` (case/whitespace/synonym mapping → allergen tokens, plus `unsupported`/`unrecognised` buckets), `recipeAllergenTokens`/`recipeViolatesAllergens` (curated tags **unioned** with high‑confidence ingredient detection), `classifyFoodGroups` (meat/fish/egg from ingredient names with a dietType+allergen fallback), and `dietCompatible` (explicit vegan/vegetarian/eggetarian/non‑veg policy).
- **`backend/src/nutrition/medical-nutrition.ts`** — `assessMedicalNutrition(responses)` → referral + reasons from `doctorDietRestrictions` and nutrition‑sensitive conditions.
- Specs: `dietary-safety.spec.ts`, `medical-nutrition.spec.ts`, `nutrition.service.spec.ts`.

### Changed
- **`backend/src/schedule/schedule-planner.service.ts`** — restriction filter now normalizes once per day and uses `dietCompatible` + `recipeViolatesAllergens`; removed the old local case‑sensitive `dietCompatible`.
- **`backend/src/schedule/schedule-planner.types.ts`** — `ScheduleRecipe` gains optional `ingredientNames` for ingredient‑level checks.
- **`backend/src/schedule/schedule.service.ts`** — maps catalog `ingredients[].ingredient.name` into `ingredientNames` before planning (the real API path now feeds ingredient data to the safety layer).
- **`backend/src/nutrition/nutrition-calculation.service.ts` / `.types.ts`** — BMR floor (`caloriesFlooredToBasal`), macro‑consistency guard → new `NEEDS_REVIEW` status, non‑negative guards, `reasons` metadata.
- **`backend/src/nutrition/nutrition.service.ts`** — reads `onboarding.responses`, passes `requiresMedicalNutritionSupport` + reasons into the calculator (the live `/nutrition` and `/today` path).
- **`backend/src/onboarding/dto/save-onboarding.dto.ts`** — `dietType` now accepts `Eggetarian`.
- **`lib/onboarding/engine.ts`** — `eggetarian → 'Eggetarian'`.
- **`backend/src/workout/workout-plan.service.ts`** — under‑18 gate returns a restricted, non‑persisted outcome before any generation; injury/mobility/doctor enforcement in the candidate pipeline is unchanged.
- **`backend/src/workout/workout-planner.types.ts`**, **`types/fitness.ts`** — add `requiresYouthReview` and `NEEDS_REVIEW` to the relevant types.

---

## 3. How the real execution paths now behave

- **Meal planning (`GET /api/v1/today`, `/schedule/*`).** `ScheduleService.getToday` → normalize restrictions once → `SchedulePlannerService.recipeFor` filters on `dietCompatible` + `recipeViolatesAllergens` against **both** the recipe's curated allergen tags and its ingredient names. Alternatives are drawn from the same already‑filtered pool, and `replaceMeal` only accepts a listed alternative, so replacement cannot bypass a restriction.
- **Nutrition targets (`GET /api/v1/nutrition`, consumed by `/today`).** `NutritionService.getTargets` reads health answers → medical referral when required; otherwise the calculator applies the BMR floor and the macro‑consistency guard, routing impossible combinations to `NEEDS_REVIEW` instead of emitting a clamped, inconsistent plan. `UNDER_18` still takes precedence.
- **Workout plan (`GET /api/v1/workouts/plan`).** Minors receive a restricted, non‑persisted `requiresYouthReview` outcome (no exercise rows written, no catalog read); `ScheduleService` already treats a no‑`id` plan as a rest day.

---

## 4. Tests added and exact results

New/updated specs (run via `npm --prefix backend test -- --runInBand`):
- `nutrition/dietary-safety.spec.ts` — case/mixed‑case/whitespace, UI chips & synonyms, ambiguous "nuts", multiple restrictions, recognised‑but‑unenforceable vs unrecognised, ingredient‑level catch, besan≠gluten, food‑group classification, and vegan/vegetarian/eggetarian/non‑veg compatibility.
- `nutrition/medical-nutrition.spec.ts` — doctor diet restriction, each nutrition‑sensitive condition, asthma/other not referred, multiple reasons.
- `nutrition/nutrition.service.spec.ts` — medical referral + diabetes referral + asthma‑no‑referral + under‑18 + incomplete profile, through the real service with mocked Prisma.
- `nutrition/nutrition-calculation.service.spec.ts` — BMR floor, non‑negative extreme‑minimum, macro consistency, impossible‑combo → `NEEDS_REVIEW`, referral reasons.
- `schedule/schedule-planner.service.spec.ts` — case‑insensitive dairy exclusion, no incompatible recipe/alternative survives, ingredient‑level catch when a tag is missing, multiple restrictions, eggetarian gets egg but never meat/fish, vegetarian/vegan correctness, non‑veg allows meat.
- `schedule/schedule.service.spec.ts` — cache hit (no regenerate) and cache‑bust on onboarding change (new fingerprint).
- `workout/workout-plan.service.spec.ts` — under‑18 restricted non‑persisted outcome (no catalog read, no persist) + adult boundary at 18 still generates.

**Result (full suite):** `Tests: 342 passed, 1 failed, 343 total` — the only failure is `http-logging.spec.ts` with a 5 s Jest timeout under full `--runInBand` load (the Nest bootstrap is slow when the whole 66 s suite runs serially). Re‑run in isolation via the "Validate backend logging" task: **PASS, 2/2 in 1.3 s**. This test is unrelated to Phase 1 and was not modified.

---

## 5. Build / typecheck results

| Gate | Command | Result |
|---|---|---|
| Backend tests | `npm --prefix backend test -- --runInBand` | 342/343 (1 flaky logging timeout, passes standalone) |
| Backend prod typecheck | `tsc --project backend/tsconfig.build.json --noEmit` | ✅ clean |
| Frontend tests | `node --test lib/api.test.cjs` | ✅ 28/28 |
| Frontend build | `next build` | ✅ compiled + typechecked |
| Prisma | n/a | **No schema change → no migration/generate required** |

---

## 6. Before / after examples

**Allergy normalization** — `foodRestrictions: ["dairy"]`, non‑vegetarian:
- Before: `"dairy"` ≠ `"DAIRY"` → Paneer `[DAIRY]` served.
- After: `normalizeRestrictions(["dairy"]) → {DAIRY}`; Paneer excluded. Same for `Dairy-free`, `lactose`, `  DaIrY  `. A missing curated tag is still caught from the `Paneer` ingredient name.

**Eggetarian selection:**
- Before: `eggetarian → Vegetarian` → egg dishes (all tagged `NON_VEGETARIAN`) unreachable.
- After: `Eggetarian` accepts vegan/vegetarian **and** egg‑only non‑veg dishes (Egg Bhurji, Masala Omelette, Boiled Egg) while excluding chicken and fish.

**Invalid nutrition inputs** — male, age 100, 100 cm, 350 kg, sedentary, fat loss:
- Before: calories ≈ 4060, protein 525 g + fat 280 g = 4620 kcal, carbs clamped to 0 → plan's macros contradict its own calorie total.
- After: `status: NEEDS_REVIEW` with an explanatory reason; no inconsistent target emitted. Separately, a sedentary fat‑loss profile whose deficit would dip below BMR is now floored to BMR (`caloriesFlooredToBasal: true`) rather than recommending sub‑basal intake.

**Medical referral** — `doctorDietRestrictions: "yes"` (or diabetes/heart/high‑BP/pregnancy):
- Before: normal calorie/macro plan returned.
- After: `status: MEDICAL_REFERRAL` with reasons, via `NutritionService.getTargets` on the live path.

**Under‑18 workout** — age 15:
- Before: standard adult plan generated and persisted.
- After: `requiresYouthReview: true`, `requiresMedicalClearance: true`, zero exercises, not persisted, with a youth‑guidance notice.

---

## 7. Remaining limitations

- **Macro drift (F2) is out of scope** for Phase 1 — the portion engine still scales by calories only; fat/carb/fiber composition is not optimized. `withinTolerance` continues to reflect calories+protein only.
- **Non‑allergen restrictions** (Jain, Halal, Kosher, Low‑carb) have no catalog metadata and are **not** silently treated as safe — they are returned as `unsupported` with a review notice (`restrictionNotices`), but are not yet surfaced in the UI.
- **Shellfish** is mapped to a canonical token but no catalog recipe/ingredient is shellfish, so nothing is filtered today (correct, but unverifiable).
- **Ingredient detection** is deliberately narrow (specific keywords, unioned with curated tags) to avoid false positives like besan/gram‑flour≠gluten; it is a safety net, not a full ingredient allergen model.
- Under‑18 and `NEEDS_REVIEW`/referral outcomes are correct at the API layer; dedicated UI messaging for these states was intentionally not built in this phase.

---

## 8. Migration / deployment requirements

- **No Prisma schema change and no migration.** `Onboarding.dietType` is already a free `String?`; `Eggetarian` stores without DB changes. `RecipeDietType` enum is untouched.
- Deployment is **code‑only**. Render's existing `startCommand` (`prisma migrate deploy` + `prisma db seed`) remains valid and idempotent; the recipe catalog is unchanged.
- Nothing was committed, pushed, or deployed (per instructions).

---

## 9. Locally verified vs live‑deployed

- **Locally verified:** all backend unit/integration tests (incl. the real `NutritionService`, `SchedulePlannerService`, and `WorkoutPlanService` paths with mocked Prisma), backend production typecheck, frontend tests, and `next build`.
- **Not verified on the live site:** these changes are **not deployed**. The deployed site still runs the previous engine, so F1 (live case‑sensitive leak), eggetarian, the new `NEEDS_REVIEW`/referral statuses, and the under‑18 workout gate are **not** yet confirmed through the real deployed UI/API. Live verification requires deploying this branch and re‑running the deployed‑origin checks described in `NUTRITION_LIVE_VALIDATION_REPORT.md`.
