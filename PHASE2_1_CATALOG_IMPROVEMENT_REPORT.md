# Phase 2.1 — Nutrition Catalog & Meal Practicality Improvements

Implemented in the production nutrition engine (`SchedulePlannerService` + the deterministic `meal-optimizer` + the recipe seed). The authoritative calorie/macro calculator, the optimizer, the status values (`MEETS_TARGETS` / `USABLE_WITH_DEVIATIONS` / `NEEDS_REVIEW`), the tolerances, and all safety rules are unchanged. **No fiber target or tolerance was lowered.**

## Git & deployment state (verified first)
- `HEAD = master = origin/master = 37e4785` ("phase 2 validation report"), 0 ahead / 0 behind; Phase 2 is the deployed version.
- Working tree before this work was clean (only the untracked `PHASE2_FOLLOWUP_AUDIT.md`).
- **Phase 2.1 is NOT committed, pushed, or deployed.** Everything below is verified locally; the live site still runs Phase 2.

---

## 1. Files changed & root causes addressed
| File | Change | Root cause (from the follow-up audit) |
|---|---|---|
| `backend/prisma/recipe-catalog.seed.ts` | +9 recipes, +3 ingredients, oats→GLUTEN policy, 4 recipe corrections | Dinner variety gap; vegan/veg fiber overshoot; oats/gluten inconsistency; unreliable ingredient lists |
| `backend/src/schedule/schedule-planner.service.ts` | `AUTO_FOUR_MEAL_CALORIES = 2600` → auto 4th meal for large plans | 3× single-dish servings (~1.3 kg) on high-calorie rest days |
| `backend/src/recipe/recipe-catalog.seed.spec.ts` | Counts 41 ingredients / 55 recipes | — |
| `backend/src/schedule/catalog-improvements.spec.ts` (new) | Gluten policy, gluten-restriction regression, meal-count, dinner variety, weekly fiber | Test coverage for all of the above |
| `backend/src/schedule/nutrition-optimization.spec.ts` | Gross-error guard now expects **zero** offenders (poha/chaat fixed) | Ingredient-reference accuracy |

No schema change, no optimizer change, no tolerance change.

## 2. New recipes (verified, ingredient-derived nutrition)
All stored values were computed from the ingredient quantities and pass the internal-consistency check (P×4 + C×4 + F×9 within 8% of stored calories) and the ingredient gross-error guard (<45%). Fiber shown as g and g/1000 kcal (target ≈14).

| Slug | Slot | Diet | kcal | P | C | F | Fiber | g/1000 | Allergens |
|---|---|---|---|---|---|---|---|---|---|
| tofu-fried-rice | DINNER | VEGAN | 490 | 20 | 69 | 15 | 4 | 8 | SOY |
| tofu-bhurji-rice | DINNER | VEGAN | 435 | 18 | 61 | 15 | 3 | 7 | SOY |
| soy-chunk-fried-rice | DINNER | VEGAN | 495 | 24 | 80 | 8 | 8 | 16 | SOY |
| paneer-jeera-rice | DINNER | VEGETARIAN | 585 | 23 | 71 | 23 | 4 | 7 | DAIRY |
| curd-rice | DINNER | VEGETARIAN | 420 | 11 | 73 | 9 | 2 | 5 | DAIRY |
| egg-curry-rice | DINNER | NON_VEG (eggetarian-ok) | 525 | 22 | 61 | 20 | 3 | 6 | EGG |
| chicken-fried-rice | DINNER | NON_VEG | 590 | 45 | 70 | 12 | 4 | 7 | — |
| tofu-banana-protein-shake | POST_WORKOUT | VEGAN | 325 | 16 | 50 | 8 | 5 | 15 | SOY |
| rava-upma | BREAKFAST | VEGAN | 370 | 12 | 59 | 9 | 7 | 19 | GLUTEN |

6 of 9 are dinners (the audited gap). 3 new ingredients added with defensible per-100 g references: **Hung curd** (90/9/5/4/0), **Moong dal, cooked** (105/7/19/0.4/7), **Semolina (rava)** (360/12.7/72.8/1.1/3.9).

## 3. Oats & gluten policy
**Policy (documented in the seed):** oats are naturally gluten-free but are commonly cross-contaminated and are not sold certified gluten-free here, so **every oat-containing recipe is tagged `GLUTEN`** (conservative — never claim gluten-safe without support). Besan (gram flour) and legumes are naturally gluten-free and remain untagged.
- Added `GLUTEN` to the 4 previously inconsistent oat recipes (`banana-almond-oats-bowl`, `soy-oats-protein-shake`, `fruit-oats-bowl`, `greek-yogurt-fruit-bowl`); `vegetable-oats-upma` already had it. All 5 oat recipes are now consistent.
- New `rava-upma` (semolina = wheat) is tagged `GLUTEN`.
- **Regression tests:** a gluten restriction (`Gluten-free` / `gluten` / `wheat`) excludes every GLUTEN recipe **and every offered alternative**, across all 7 days and all four diets — so it cannot be bypassed by selection or meal replacement (replacement only accepts the pre-filtered listed alternatives).

## 4. Ingredient-reference corrections
| Recipe | Before | After (ingredient-derived) |
|---|---|---|
| `vegetable-poha` | 330 kcal (ingredient sum ~510, −35%) | Peanuts 12→10 g, oil 8→6 ml; **480 kcal / 12P / 81C / 12F / 7fib** = ingredient sum (0.3% off) |
| `sprouts-chaat` → **Sprouts Potato Chaat** | 220 kcal / 14P (unsupportable from 150 g sprouts) | Added boiled potato + a little oil; **190 kcal / 7P / 32C / 4F / 7fib** (protein honestly lowered) |
| `vegetable-khichdi` | used dry `Moong dal` for a cooked dish | now uses **`Moong dal, cooked` 100 g**; 420 kcal / 14P / 73C / 7F / 11fib |
| `hung-curd-protein-bowl` | reused Greek-yogurt ref (under-counted) | now uses dedicated **`Hung curd`** ref; 205 kcal / 16P / 20C / 7F / 2fib |

`moong-dal-chilla` and `dal-tadka-roti` intentionally keep the **dry** `Moong dal` reference (the dal is measured/ground dry in those recipes) — documented, so dry vs cooked are now distinguished. The ingredient gross-error guard now passes with **zero** offenders (both prior offenders fixed).

## 5. Before / after — fiber, macros, portions
"Before" = the **deployed Phase 2** engine, measured live (`PHASE2_LIVE_VALIDATION_REPORT.md`). "After" = Phase 2.1 measured **locally** through the same service path (rest day). Format: cal% / P% / C% / F% / **fiber%** [status].

| Profile (muscle, 2920 kcal) | Before (Phase 2, live) | After (Phase 2.1, local) |
|---|---|---|
| Vegetarian | −7 / −8.3 / −10.1 / +6.2 / **+39** [USABLE], 3 meals | −2.4 / −5 / −9.7 / +15.4 / **+14.6** [**MEETS**], 4 meals |
| Vegan | −7.6 / −5.8 / −8.6 / −9.2 / **+56.1** [USABLE], 3 meals | −4.3 / −10.8 / −4.7 / +4.6 / **+19.5** [**MEETS**], 4 meals |
| Eggetarian | −7 / −3.3 / −13.6 / −1.5 / **+43.9** [USABLE] | −3.4 / −3.3 / −6.5 / +7.7 / **+24.4** [**MEETS**] |
| Non-vegetarian | −7 / −5.8 / −13.8 / +12.3 / +19.5 [MEETS] | −6.3 / +4.2 / −12.7 / −1.5 / +17.1 [MEETS] |
| Vegetarian · fat loss (2420) | −9 / +3.5 / −14.3 / 0 / +20.6 [MEETS], 3 meals | −2.3 / +4.4 / −1.7 / −8.3 / +20.6 [MEETS], 3 meals |

**Weekly fiber (Phase 2.1, local, 7 days):** Vegetarian meets fiber tolerance on **6/7** days (1 USABLE at +44%); Vegan **6/7** days (1 USABLE at +34%). No day is `NEEDS_REVIEW`. Previously both were over tolerance every day.

## 6. Dinner variety & serving practicality
- **Dinner variety over 7 days:** Vegetarian **5** distinct (was 3), Non-vegetarian **≥4**, Vegan **3** low-fiber tofu/soya dinners (was 3 legume-heavy — a *quality* improvement; see limitations).
- **Serving size:** high-calorie plans (≥2600 kcal) now default to **4 meals** (adds a mid-afternoon snack), so the max single-dish serving on the veg rest-day dropped from **3× → 2.5×**; the ~1.3 kg single lunch is eliminated. Lower-calorie plans stay at 3 meals; an explicit `mealsPerDay` preference always wins.

## 7. Gluten / allergy regression results
- Gluten restriction: 0 GLUTEN recipes/alternatives across 7 days × 4 diets, for `Gluten-free`, `gluten`, and `wheat` inputs.
- Existing allergy (dairy/soy/fish/peanut/tree-nut) and diet rules (vegan/vegetarian/eggetarian/non-veg) remain hard constraints — unchanged Phase 1/2 safety specs all pass.

## 8. Test, typecheck & build results
| Gate | Command | Result |
|---|---|---|
| Backend tests | `npm --prefix backend test -- --runInBand` | **382 passed / 382** (32 suites) |
| Backend prod typecheck | `tsc --project backend/tsconfig.build.json --noEmit` | ✅ clean |
| Frontend tests | `node --test lib/api.test.cjs` | ✅ 28/28 |
| Frontend build | `next build` | ✅ clean |
| Prisma | n/a | **No schema change** → no migration; seed is idempotent upserts applied on deploy |

## 9. Remaining catalog limitations
- **Vegan dinner variety is 3** (not 4+). A vegan muscle dinner must be simultaneously high-protein, high-carb, and low-fiber, which only tofu/soya-with-white-rice dishes satisfy; additional such recipes are near-duplicates that the optimizer dominates. The 3 chosen are now low-fiber (quality win) and no safety/macro rule is traded. Improving this further needs either new low-fiber vegan protein ingredients (e.g., vegan protein isolate, seitan-free options) or a cross-day variety penalty (the planner is currently stateless per day).
- **Occasional fiber days** (≈1/7) remain over tolerance for veg/vegan on rotations that force higher-fiber combinations — honestly reported as `USABLE_WITH_DEVIATIONS`.
- **Hung curd / cooked-dal references** are defensible estimates, not brand-measured; flagged as estimates in `nutritionBasis`.
- No micronutrients beyond fiber (catalog has none) — unchanged, out of scope.

## 10. Deployment status
Not deployed. These changes are local only; the live site runs Phase 2. Applying them requires committing, pushing, and letting Render run `prisma db seed` (idempotent) — **pending your approval**. No production data reset, no safety rule weakened.
