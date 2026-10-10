// Macro-aware meal optimizer (pure, deterministic, no Nest/Prisma).
//
// Phase 1 of the project selected one rotated recipe per slot and scaled its servings by CALORIES
// only, so the combined day hit calories while missing fat/carbs/fiber. This module instead:
//   1. keeps the caller's day-rotated recipe pick per slot (preserves day-to-day VARIETY),
//   2. optimises servings across all slots jointly to match every macro target,
//   3. only when the plan is still outside the documented tolerances, swaps individual recipes to
//      the safe pool option that best reduces the out-of-tolerance macros.
// Variety is preserved whenever targets are already met; recipes change only when the catalog or
// serving limits genuinely cannot otherwise hit the targets.
//
// Safety is NOT handled here: pools are pre-filtered for diet + allergens (Phase 1) and never relaxed.

export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface OptimizerRecipe {
  id: string;
  calories: number; // per serving
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
  rotationIndex: number; // position in the day's rotated, preference-ordered pool (0 = most preferred)
  preferenceBias: number; // <0 liked/preferred cuisine, >0 disliked (nudges swaps only)
}

export interface OptimizerSlot {
  slot: string;
  calorieShare: number; // fraction of the day's calories this slot should carry
  pool: OptimizerRecipe[]; // diet/allergen-safe, ordered by preference then rotation (variety)
}

export interface SlotSelection {
  slot: string;
  recipeId: string;
  servings: number;
  alternativeRecipeIds: string[];
}

export interface OptimizerConfig {
  macroWeights: { calories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number; fiberGrams: number };
  tolerances: { calories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number; fiberGrams: number };
  varietyWeight: number;
  windowSize: number;
  minServings: number;
  maxServings: number;
  servingStep: number;
  maxIterations: number;
}

// Documented defaults. Protein is weighted highest (fitness priority); fiber lowest (softer signal).
export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = {
  macroWeights: { calories: 1, proteinGrams: 1.3, carbohydrateGrams: 1, fatGrams: 1, fiberGrams: 0.4 },
  tolerances: { calories: 10, proteinGrams: 15, carbohydrateGrams: 15, fatGrams: 20, fiberGrams: 25 },
  varietyWeight: 0.03,
  windowSize: 10,
  minServings: 0.5,
  maxServings: 3,
  servingStep: 0.25,
  maxIterations: 6,
};

type MacroKey = keyof MacroTargets;
const MACRO_KEYS: MacroKey[] = ['calories', 'proteinGrams', 'carbohydrateGrams', 'fatGrams', 'fiberGrams'];

interface Totals { calories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number; fiberGrams: number; }
interface Assignment { recipe: OptimizerRecipe; servings: number; }

function emptyTotals(): Totals { return { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0 }; }

function addRecipe(totals: Totals, recipe: OptimizerRecipe, servings: number): Totals {
  return {
    calories: totals.calories + recipe.calories * servings,
    proteinGrams: totals.proteinGrams + recipe.proteinGrams * servings,
    carbohydrateGrams: totals.carbohydrateGrams + recipe.carbohydrateGrams * servings,
    fatGrams: totals.fatGrams + recipe.fatGrams * servings,
    fiberGrams: totals.fiberGrams + recipe.fiberGrams * servings,
  };
}

function relDeviationSquared(actual: number, target: number): number {
  if (target <= 0) return 0;
  const d = (actual - target) / target;
  return d * d;
}

export function macroScore(totals: Totals, targets: MacroTargets, weights: OptimizerConfig['macroWeights']): number {
  let score = 0;
  for (const key of MACRO_KEYS) score += weights[key] * relDeviationSquared(totals[key], targets[key]);
  return score;
}

export function countViolations(totals: Totals, targets: MacroTargets, tolerances: OptimizerConfig['tolerances']): number {
  let violations = 0;
  for (const key of MACRO_KEYS) {
    if (targets[key] <= 0) continue;
    const pct = Math.abs((totals[key] - targets[key]) / targets[key]) * 100;
    if (pct > tolerances[key]) violations++;
  }
  return violations;
}

function servingLevels(cfg: OptimizerConfig): number[] {
  const levels: number[] = [];
  for (let s = cfg.minServings; s <= cfg.maxServings + 1e-9; s += cfg.servingStep) levels.push(Math.round(s * 100) / 100);
  return levels;
}

function dayTotals(assignments: Assignment[]): Totals {
  let totals = emptyTotals();
  for (const assignment of assignments) totals = addRecipe(totals, assignment.recipe, assignment.servings);
  return totals;
}

// Totals of every slot except `exceptIndex`.
function totalsExcept(assignments: Assignment[], exceptIndex: number): Totals {
  let totals = emptyTotals();
  for (let i = 0; i < assignments.length; i++) if (i !== exceptIndex) totals = addRecipe(totals, assignments[i].recipe, assignments[i].servings);
  return totals;
}

// Coordinate descent over SERVINGS only (recipes fixed) — preserves recipe variety.
function optimizeServings(assignments: Assignment[], targets: MacroTargets, cfg: OptimizerConfig, levels: number[]): void {
  for (let iteration = 0; iteration < cfg.maxIterations; iteration++) {
    let improved = false;
    for (let i = 0; i < assignments.length; i++) {
      const others = totalsExcept(assignments, i);
      let best = assignments[i].servings;
      let bestScore = macroScore(addRecipe(others, assignments[i].recipe, best), targets, cfg.macroWeights);
      for (const servings of levels) {
        const score = macroScore(addRecipe(others, assignments[i].recipe, servings), targets, cfg.macroWeights);
        if (score < bestScore - 1e-9) { best = servings; bestScore = score; }
      }
      if (best !== assignments[i].servings) { assignments[i].servings = best; improved = true; }
    }
    if (!improved) break;
  }
}

// Best serving for a specific recipe in a slot, given the rest of the day fixed.
function bestServingFor(recipe: OptimizerRecipe, others: Totals, targets: MacroTargets, cfg: OptimizerConfig, levels: number[]): { servings: number; score: number } {
  let best = levels[0];
  let bestScore = Infinity;
  for (const servings of levels) {
    const score = macroScore(addRecipe(others, recipe, servings), targets, cfg.macroWeights);
    if (score < bestScore - 1e-9) { best = servings; bestScore = score; }
  }
  return { servings: best, score: bestScore };
}

/**
 * Select one recipe + practical serving per slot. Variety-first (keep the rotated pick), optimise
 * servings jointly, and swap a recipe only to reduce out-of-tolerance macros. Fully deterministic.
 */
export function optimizeMealPlan(slots: OptimizerSlot[], targets: MacroTargets, config: Partial<OptimizerConfig> = {}): SlotSelection[] {
  const cfg: OptimizerConfig = {
    ...DEFAULT_OPTIMIZER_CONFIG,
    ...config,
    macroWeights: { ...DEFAULT_OPTIMIZER_CONFIG.macroWeights, ...(config.macroWeights ?? {}) },
    tolerances: { ...DEFAULT_OPTIMIZER_CONFIG.tolerances, ...(config.tolerances ?? {}) },
  };
  const levels = servingLevels(cfg);
  if (!slots.length) return [];

  // Variety-first initial assignment: rotated top pick per slot, scaled by its calorie share.
  // Skip a recipe already taken by an earlier slot so the day never repeats a dish.
  const usedIds = new Set<string>();
  const assignments: Assignment[] = slots.map((slot) => {
    const recipe = slot.pool.find((candidate) => !usedIds.has(candidate.id)) ?? slot.pool[0];
    usedIds.add(recipe.id);
    const share = (targets.calories * slot.calorieShare) / Math.max(1, recipe.calories);
    const stepped = Math.round(share / cfg.servingStep) * cfg.servingStep;
    const servings = Math.min(cfg.maxServings, Math.max(cfg.minServings, Math.round(stepped * 100) / 100));
    return { recipe, servings };
  });

  optimizeServings(assignments, targets, cfg, levels);

  // Tolerance-gated recipe swaps: only change a recipe while the plan is still out of tolerance.
  for (let pass = 0; pass < cfg.maxIterations; pass++) {
    if (countViolations(dayTotals(assignments), targets, cfg.tolerances) === 0) break;
    let improved = false;
    for (let i = 0; i < slots.length; i++) {
      if (countViolations(dayTotals(assignments), targets, cfg.tolerances) === 0) break;
      const others = totalsExcept(assignments, i);
      const usedElsewhere = new Set(assignments.filter((_, index) => index !== i).map((assignment) => assignment.recipe.id));
      const window = slots[i].pool.slice(0, cfg.windowSize).filter((recipe) => !usedElsewhere.has(recipe.id));
      const candidates = window.length ? window : slots[i].pool.filter((recipe) => !usedElsewhere.has(recipe.id));
      const poolSize = Math.max(1, slots[i].pool.length);

      const currentFit = bestServingFor(assignments[i].recipe, others, targets, cfg, levels);
      let best = {
        recipe: assignments[i].recipe,
        servings: currentFit.servings,
        violations: countViolations(addRecipe(others, assignments[i].recipe, currentFit.servings), targets, cfg.tolerances),
        varietyKey: varietyKey(assignments[i].recipe, poolSize),
        score: currentFit.score,
      };
      for (const recipe of candidates) {
        const fit = bestServingFor(recipe, others, targets, cfg, levels);
        const violations = countViolations(addRecipe(others, recipe, fit.servings), targets, cfg.tolerances);
        const candidate = { recipe, servings: fit.servings, violations, varietyKey: varietyKey(recipe, poolSize), score: fit.score };
        // Prefer fewer violations; then variety/preference (keeps day-to-day rotation); then macro fit.
        if (isBetterSwap(candidate, best)) best = candidate;
      }
      if (best.recipe.id !== assignments[i].recipe.id || best.servings !== assignments[i].servings) {
        assignments[i] = { recipe: best.recipe, servings: best.servings };
        improved = true;
      }
    }
    if (improved) optimizeServings(assignments, targets, cfg, levels);
    else break;
  }

  return slots.map((slot, i) => {
    const chosen = assignments[i].recipe;
    const usedElsewhere = new Set(assignments.filter((_, index) => index !== i).map((assignment) => assignment.recipe.id));
    const alternativeRecipeIds = slot.pool
      .filter((recipe) => recipe.id !== chosen.id && !usedElsewhere.has(recipe.id))
      .slice(0, 2)
      .map((recipe) => recipe.id);
    return { slot: slot.slot, recipeId: chosen.id, servings: assignments[i].servings, alternativeRecipeIds };
  });
}

// Lower is better: disliked recipes sink to the back; otherwise rotation order drives variety.
function varietyKey(recipe: OptimizerRecipe, poolSize: number): number {
  return (recipe.preferenceBias > 0 ? 1000 : 0) + recipe.rotationIndex / Math.max(1, poolSize);
}

interface SwapCandidate { violations: number; varietyKey: number; score: number; }

// A swap is accepted only to reduce out-of-tolerance macros; among equally-compliant options the
// most variety-friendly (and preferred) one wins, with macro fit as the final tie-break. This keeps
// recipes changing only when the catalog forces it, and rotates across days when it does.
function isBetterSwap(candidate: SwapCandidate, best: SwapCandidate): boolean {
  if (candidate.violations !== best.violations) return candidate.violations < best.violations;
  if (Math.abs(candidate.varietyKey - best.varietyKey) > 1e-9) return candidate.varietyKey < best.varietyKey;
  return candidate.score < best.score - 1e-9;
}

