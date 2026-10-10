# Phase 2 — Follow-up Audit

Read-only audit. No application code was changed, committed, pushed, or deployed. Findings below are verified against the actual Git repo, the deployed API/UI, and the real recipe/ingredient data.

---

## 1. Git & deployment state (verified)

| Fact | Verified value |
|---|---|
| Current branch / HEAD | `master` @ `37e4785` "phase 2 validation report" |
| Remote tracking | `origin/master` = `origin/HEAD` = `37e4785` (0 ahead, 0 behind) |
| Working tree | **Clean** (`git status --porcelain` empty) |
| Phase 2 code commit | `1f88cce` "phase2 completed" — contains `meal-optimizer.ts`, `recipe-nutrition.ts`, seed +18 lines, planner/service/types/Dashboard changes, 3 new specs |
| Remote | `github.com/AbhinayCodes/Body_Fitness_web_page.git` |
| Deployed app | Serves Phase 2 — `/today` `nutritionSummary` includes `status`/`macrosWithinTolerance`/`unmetTargets` |

**Reconciliation:** there is **no real contradiction**. `PHASE2_NUTRITION_OPTIMIZATION_REPORT.md` said "nothing committed/pushed/deployed" — that was accurate at the moment it was written. The changes were then committed (`1f88cce`), the live report added (`37e4785`), pushed to `origin/master`, and Render auto-deployed. The live report is current and correct. The two reports simply describe different points in time.

**Minor note:** `backend/tsconfig.build.tsbuildinfo` (a build artifact) was committed in `1f88cce`. Harmless, but ideally git-ignored.

---

## 2. Vegetarian/vegan fiber overshoot — root cause

### Live measurement (deployed `/schedule/week`, target 41 g/day)
| Diet | Daily fiber across the week (g) | vs target |
|---|---|---|
| Vegetarian · muscle | 44, 66, 56, 45, 62, 57, 51 | +7% … +61% |
| Vegan · muscle | 61, 65, 60, 58, 63, 64, 68 | +41% … +66% |

Vegan is consistently worse and never reaches tolerance.

### The target is correct, not the cause
`NutritionCalculationService` sets `fiberGrams = round(calories/1000 × 14)` → 14 g per 1000 kcal, the standard US Dietary Guidelines / IOM recommendation. This is an evidence-based target and should **not** be lowered.

### The data is accurate, not the cause
Fiber values match the ingredients. Example — Rajma Chawal (15 g): rajma 220 g × 6.4 g/100 g ≈ 14 g + rice/veg ≈ 1 g ≈ 15 g. Spot-checks across legume dishes reconcile.

### Root cause = recipe composition (fiber density of the plant-protein sources)
The engine must hit the **protein** target; in this catalog the vegetarian/vegan protein sources are legumes and whole grains, which are intrinsically fiber-dense. Representative fiber density (g fiber / 1000 kcal; target = 14):

| Recipe | Diet | g/1000 kcal |
|---|---|---|
| Chole with Roti | VEGAN | ~32 |
| Rajma Chawal / Rajma Power Bowl | VEGAN | ~27–29 |
| Chana Masala / Dal Rice | VEGAN | ~25–28 |
| Lemon Chickpea Rice (new) | VEGAN | ~22 |
| Besan Chilla | VEGAN | ~23 |
| Vegetable Khichdi (new) | VEGAN | ~26 |
| Tofu Veg Stir Fry | VEGAN | ~17 |
| Idli / Dosa | VEGAN | ~16–22 / ~16 |
| Paneer dishes | VEGETARIAN | ~14–17 |
| Greek Yogurt Fruit Bowl (new) | VEGETARIAN | ~16 |
| Grilled Chicken + Sweet Potato | NON-VEG | ~14 |
| Egg / chicken / fish dishes | NON-VEG | ~8–17 |

A plan built from ~25 g/1000-kcal recipes lands near **50 g** fiber at 2000 kcal versus a 28 g target — an unavoidable +80% unless lower-fiber protein sources are available. **Vegans are worst off** because they have no low-fiber complete protein (no dairy/egg); the only low-fiber vegan protein in the catalog is **tofu** (0.3 g/100 g) and **soy milk**.

Serving constraints (0.5–3×) are a secondary amplifier: on 3-meal rest days the optimizer pushes a legume lunch to 3× (see §4), multiplying its fiber.

### Evidence-based fix options (not implemented — for your approval)
1. **Primary — add low-fiber plant protein/carb recipes** so the optimizer has compliant choices:
   - Vegan: more **tofu**-centric bowls (tofu + white rice + low-fiber veg), **soy-milk/soy-yogurt** smoothies, **dosa/idli/poha** (fermented/refined rice, low fiber), rice-noodle stir-fries.
   - Vegetarian: **paneer + white rice**, **Greek-yogurt/hung-curd** bowls, **egg** options for eggetarian, **semolina (rava) upma/idli**.
   These sit at ~12–17 g/1000 kcal and would let the optimizer meet fiber without dropping protein.
2. **Secondary — optimizer weighting:** once such recipes exist, a modest increase to the fiber weight (currently 0.4) lets it prefer lower-fiber options among compatible ones. Ineffective alone (catalog has nothing lower to pick).
3. **Validation semantics (optional, use with care):** fiber above target is not harmful up to a point; a defensible, evidence-based change is an **asymmetric** fiber rule — treat ≥ target as satisfied and only flag when *below* target or *extremely* high (e.g., > 70 g absolute or > +100%). This is a legitimate nutrition stance, **not** target manipulation, but it changes what "deviation" means, so it should be an explicit product decision — not a silent way to pass tests. Recommended only alongside option 1, not instead of it.

**Recommendation:** do option 1 (add recipes); reassess before touching weighting or validation semantics.

---

## 3. Recipe catalog verification

All 12 new recipes were checked for internal macro consistency (P×4 + C×4 + F×9 vs stored calories), diet/allergen correctness, serving size, and ingredient plausibility.

- **Internal consistency:** all 46 catalog recipes pass within 8% (automated test). The 12 new recipes are within ~1–3%.
- **Serving grams:** match the sum of ingredient grams (e.g. fruit-oats-bowl 380 g = 50+100+80+150; paneer-veg-salad ~330 g). ✅
- **Diet/allergen tags:** correct for all 12 — vegan recipes contain no animal products; eggetarian-eligible egg dishes carry `EGG` and no meat/fish; dairy/soy/fish/gluten tags present where applicable. ✅
- **New ingredient reference values** (per 100 g) are plausible: Apple 52/0.3/14/0.2/2.4; Greek yogurt 59/10/3.6/0.4/0; Cucumber 15/0.7/3.6/0.1/0.5; Carrot 41/0.9/9.6/0.2/2.8; Egg white 52/11/0.7/0.2/0. ✅

### Findings (data quality, not fabrication)
1. **Oats ↔ GLUTEN tagging is inconsistent (catalog-wide, pre-existing + inherited by new recipes).** `vegetable-oats-upma` tags `GLUTEN`, but **4** other oats recipes do not: `banana-almond-oats-bowl`, `soy-oats-protein-shake` (both pre-Phase 2), and the new `fruit-oats-bowl`, `greek-yogurt-fruit-bowl`. Oats are naturally gluten-free but commonly cross-contaminated. **Impact:** a gluten-restricted user is correctly kept off oats-upma but could be served the other oats dishes. This should be reconciled to one policy (tag all oats `GLUTEN`, or none, and document why). *Potential safety relevance for gluten-restricted users.*
2. **`hung-curd-protein-bowl` calories under-modelled by ingredients.** It reuses the `Greek yogurt` reference (59 kcal/100 g) for hung curd, which is denser (~90–110 kcal/100 g). Stored 200 kcal vs ingredient-derived ~148 kcal (+35%). Internally consistent (P20/C20/F4 → 196≈200), but a dedicated "Hung curd" ingredient would be more accurate.
3. **`vegetable-khichdi` uses the dry `Moong dal` reference** (347 kcal/100 g) for a cooked dish, so the ingredient-derived estimate (~521) runs ~21% above stored (430). Within the gross-error guard but worth a cooked-dal reference.
4. **Legacy (pre-Phase 2) gross ingredient/stored mismatches remain:** `vegetable-poha` (ingredient ~510 vs stored 330, −35%) and `sprouts-chaat` (ingredient ~72 vs stored 220 — ingredient list omits chaat add-ins). Internally consistent; ingredient lists are unreliable calorie proxies. These are flagged by the Phase 2 reconciliation utility, not fabricated.

No new recipe has fabricated or internally inconsistent values.

---

## 4. Weekly variety & practicality (live)

- **Variety (distinct dishes / 7 days):** Vegetarian — breakfast 5, lunch 5, **dinner 3**. Vegan — breakfast 4, lunch 4, **dinner 3**. Breakfast/lunch variety is good; **dinner variety is weak (3/7)** because the optimizer converges on a few macro-suitable dinners.
- **Stability / regeneration:** same-day reload is byte-identical; a changed restriction produces a new plan; a new week rotates selections (verified previously and consistent with the deterministic `dayNumber` rotation).
- **Practicality of servings:** the optimizer reaches the **3× cap** on 3-meal rest days — e.g. live veg rest day: *Dal Rice with Vegetables ×3* (~1,440 kcal, ~1.3 kg food in one sitting). This is large but bounded. Training days (4–5 meals via pre/post-workout) distribute portions sensibly (e.g. ×1.25–×2.25). The `mealsPerDay ≥ 4` snack slot (added in Phase 2) would relieve rest-day portion size but defaults to 3.

### Findings
- **Dinner repetition** (3 distinct/7) is the main variety weakness; more dinner-slot recipes (especially lower-fiber ones from §2) would help both variety and fiber.
- **Large single servings** on 3-meal high-calorie rest days; consider defaulting higher-calorie plans to 4 meals, or widening the dinner/lunch pool.

---

## 5. Measured examples (live, deployed)

- **Vegan muscle, rest day:** Besan Chilla ×2.75 / Lemon Chickpea Rice ×2.25 / Vegetable Khichdi ×2 → fiber ~64 g vs 41 target (+56%); fat −9%, protein −6%, calories −8% (`USABLE_WITH_DEVIATIONS`, unmet = fiber).
- **Vegetarian muscle, rest day:** Dosa ×1.5 / Dal Rice ×3 / Paneer Bhurji ×1.5 → 2,715 kcal, fiber 57 g (+39%); fat +6%, all else within tolerance.
- **Non-veg muscle:** Idli ×2.5 / Egg Veg Pulao ×1.5 / Tofu Stir Fry ×2.25 → `MEETS_TARGETS` (fiber +19.5%).
- **Female fat-loss non-veg:** `MEETS_TARGETS`, every macro within ±8%.

---

## 6. Recommended next steps (priority order)
1. **Add ~6–10 low-fiber plant-protein / refined-carb recipes** (tofu/paneer/dairy/egg + white rice / dosa / idli / rava), weighted to **dinner** and **vegan** slots. Biggest, most honest lever for the fiber overshoot and the dinner-variety gap.
2. **Reconcile the oats→GLUTEN tagging** to a single documented policy (gluten-restricted safety).
3. Add accurate **"Hung curd"** and **"cooked moong dal"** ingredient references; revisit legacy `vegetable-poha` / `sprouts-chaat` ingredient lists.
4. After (1), consider a small **fiber-weight** bump in the optimizer; only then consider an **asymmetric fiber** validation rule as an explicit product decision.
5. Consider defaulting **4 meals** for high-calorie plans to reduce 3× single servings.
6. Add `backend/tsconfig.build.tsbuildinfo` to `.gitignore`.

No change was made to application code, and nothing was committed, pushed, or deployed during this audit.
