# Nutrition Engine — Live Failure Report

Validated live against https://body-fitness-web-page.onrender.com/ (and `formwell-api.onrender.com`) on 2026-10-04 via the deployed UI's own request path. The new engine **is live and working** for its primary goals (portion scaling + calorie accuracy + variety + weekly stability). The issues below are real and reproducible on the deployed site.

---

## F1 — CRITICAL (SAFETY): allergy filter is case-sensitive; lowercase input is silently ignored
**Severity: High (safety).**

**Reproduction (live):** Non-vegetarian profile, `foodRestrictions = ["dairy"]` (lowercase).
**Result:** Lunch returned **Paneer Veg Rice Bowl**, which is tagged `allergens: ["DAIRY"]`. A dairy-restricted user was served dairy.

**Control:** The exact same profile with `foodRestrictions = ["DAIRY"]` (uppercase) correctly excluded all dairy dishes (Idli / Chicken Curry / Egg Bhurji).

**Root cause:** `schedule-planner.service.ts` filters with `!recipe.allergens.some(a => input.restrictions.includes(a))`. Recipe allergen tokens are uppercase (`DAIRY`, `GLUTEN`, …) but user restrictions are compared **verbatim**, so any non-uppercase token never matches.

**Impact in practice:** The production onboarding UI uses predefined allergen chips (likely already uppercase), so typical users are protected — but any free-text / differently-cased restriction passes through silently. This matches the task's Part 17 requirement ("normalize input… do not silently ignore free-text allergies").

**Recommended fix (one line, not architectural):** normalize both sides to a canonical case before comparison, e.g. upper-case and trim user restrictions in the planner (and ideally at the onboarding DTO boundary). I did **not** apply it because you asked for no further changes during this validation pass — ready to implement on your approval.

---

## F2 — HIGH: macro composition drifts even when calories (and sometimes protein) are on target
**Severity: Medium-High (nutrition quality).** Explicitly reported separately so it is **not** hidden behind the calorie tolerance.

Across all live scenarios, calories landed within ±4.7%, but:

| Scenario | cal % | protein % | carb % | fat % | fiber % |
|---|---|---|---|---|---|
| P1 muscle 75 | +0.7 | +14.2 | **−18.5** | **+46.2** | **+73.2** |
| P2 fat loss | −0.6 | −0.9 | −12 | **+26.7** | **+73.5** |
| P3 90 kg | −2.7 | −1.4 | **−17.2** | **+36.1** | **+70.5** |
| P4 sedentary | +0.9 | **−10** | −5.9 | **+23.3** | **+78.1** |
| Vegan | −0.4 | **−15.8** | +0.4 | +6.2 | +53.7 |
| Non-veg | −2.1 | **+33.3** | **−22.8** | **+30.8** | +2.4 |
| Allergy (DAIRY) | +4.7 | **+41.7** | **−17.7** | **+43.1** | +26.8 |

**Pattern:** fat is consistently **over** target and carbs **under**; fiber is far over for vegetarian/vegan plans; protein swings from −16% to +42% depending on diet.

**Root cause:** the portion engine scales each meal by **calories only** and selects dishes for variety, not macro fit. The macro mix is whatever the chosen dishes happen to contain. Paneer/oil-rich Indian dishes are fat-dense; legume dishes are fiber-dense; meanwhile the carb target (464 g) produced by the carb-remainder formula is high, so a calorie-correct plan structurally overshoots fat and undershoots carbs.

**`withinTolerance` flag caveat:** it only checks calories ≤10% and protein ≤15%, so P1–P4 report `withinTolerance=true` despite fat being +23% to +46%. The flag should not be read as "all macros fine."

**Recommended direction (future, not done now):** add a macro-aware scoring/secondary adjustment pass (e.g. prefer lower-fat or higher-carb options when fat is over target), and/or widen protein-source balance. This is a planned enhancement, intentionally out of scope for this validation pass.

---

## F3 — LOW / BY DESIGN: training days have no DINNER slot
On training days (gym 18:00), the 20:30 dinner is removed by the ≥120-minute spacing rule because a 19:30 **post-workout** meal already covers the evening. This is intended behavior (post-workout meal replaces dinner), and calories still hit target (2,900–2,975), but flagged for awareness since the "Dinner" label disappears on those days.

---

## F4 — INFO: features not exposable from the current live endpoints
- **Week 2 cannot be fetched live.** `GET /api/v1/schedule/week` serves only the current week (no date parameter). Week-to-week variety is verified by the deterministic `dayNumber` rotation (7 distinct days this week) plus the backend unit test (`dayNumber+7` differs), not by a second live week fetch. A date parameter was deliberately **not** added per the no-further-changes instruction.
- **Eggetarian** is not a diet option in the deployed app (enum: Vegetarian / Non-vegetarian / Vegan / No preference).

---

## Not failures (verified working live)
- Portion scaling: target 2,920 → 2,940 actual (+0.7%); old build was ~1,410 (−52%).
- Targets respond to inputs: muscle 2,920 vs fat-loss 2,420 vs 90 kg 3,150 vs sedentary 2,310; protein 120 → 144 with weight.
- Diet filtering: vegan plan 100% vegan; non-veg includes meat; vegetarian excludes meat/fish.
- Weekly stability: same week reload is byte-identical (not random).
- Weekly variety: 7 distinct breakfasts in one week.
- UI render: dashboard shows portion-scaled meals + "Planned meals provide" target-vs-actual line.
