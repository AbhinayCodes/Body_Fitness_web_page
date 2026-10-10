import { describe, expect, it } from '@jest/globals';
import { countViolations, macroScore, optimizeMealPlan, DEFAULT_OPTIMIZER_CONFIG, type MacroTargets, type OptimizerSlot, type OptimizerRecipe } from './meal-optimizer';

const targets: MacroTargets = { calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 60, fiberGrams: 28 };

// A recipe internally consistent with the target macro ratio at a given calorie level.
function proportional(id: string, calories: number, rotationIndex = 0, preferenceBias = 0): OptimizerRecipe {
  const f = calories / targets.calories;
  return { id, calories, proteinGrams: Math.round(targets.proteinGrams * f), carbohydrateGrams: Math.round(targets.carbohydrateGrams * f), fatGrams: Math.round(targets.fatGrams * f), fiberGrams: Math.round(targets.fiberGrams * f), rotationIndex, preferenceBias };
}

function recipe(id: string, macros: Partial<OptimizerRecipe> & { calories: number }, rotationIndex = 0, preferenceBias = 0): OptimizerRecipe {
  return { id, calories: macros.calories, proteinGrams: macros.proteinGrams ?? 0, carbohydrateGrams: macros.carbohydrateGrams ?? 0, fatGrams: macros.fatGrams ?? 0, fiberGrams: macros.fiberGrams ?? 0, rotationIndex, preferenceBias };
}

describe('meal-optimizer', () => {
  it('scores lower as totals approach targets', () => {
    const near = macroScore({ calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 60, fiberGrams: 28 }, targets, DEFAULT_OPTIMIZER_CONFIG.macroWeights);
    const far = macroScore({ calories: 2000, proteinGrams: 60, carbohydrateGrams: 250, fatGrams: 120, fiberGrams: 28 }, targets, DEFAULT_OPTIMIZER_CONFIG.macroWeights);
    expect(near).toBe(0);
    expect(far).toBeGreaterThan(near);
  });

  it('counts a macro as violated only outside its tolerance', () => {
    const totals = { calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 90, fiberGrams: 28 }; // fat +50%
    expect(countViolations(totals, targets, DEFAULT_OPTIMIZER_CONFIG.tolerances)).toBe(1);
  });

  it('chooses servings within bounds and snapped to the step', () => {
    const slots: OptimizerSlot[] = [
      { slot: 'BREAKFAST', calorieShare: 0.3, pool: [proportional('b', 500)] },
      { slot: 'LUNCH', calorieShare: 0.35, pool: [proportional('l', 600)] },
      { slot: 'DINNER', calorieShare: 0.35, pool: [proportional('d', 550)] },
    ];
    const result = optimizeMealPlan(slots, targets);
    for (const selection of result) {
      expect(selection.servings).toBeGreaterThanOrEqual(0.5);
      expect(selection.servings).toBeLessThanOrEqual(3);
      expect(Math.round(selection.servings * 4) % 1).toBe(0); // multiple of 0.25
    }
  });

  it('hits every macro when the catalog is proportional to the target ratio', () => {
    const slots: OptimizerSlot[] = [
      { slot: 'BREAKFAST', calorieShare: 0.3, pool: [proportional('b', 540)] },
      { slot: 'LUNCH', calorieShare: 0.35, pool: [proportional('l', 700)] },
      { slot: 'DINNER', calorieShare: 0.35, pool: [proportional('d', 640)] },
    ];
    const result = optimizeMealPlan(slots, targets);
    const totals = result.reduce((sum, selection) => {
      const r = slots.flatMap((slot) => slot.pool).find((candidate) => candidate.id === selection.recipeId)!;
      return { calories: sum.calories + r.calories * selection.servings, proteinGrams: sum.proteinGrams + r.proteinGrams * selection.servings, carbohydrateGrams: sum.carbohydrateGrams + r.carbohydrateGrams * selection.servings, fatGrams: sum.fatGrams + r.fatGrams * selection.servings, fiberGrams: sum.fiberGrams + r.fiberGrams * selection.servings };
    }, { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0 });
    expect(countViolations(totals, targets, DEFAULT_OPTIMIZER_CONFIG.tolerances)).toBe(0);
  });

  it('keeps the rotated (variety) pick when it already meets the targets, instead of chasing a marginally better recipe', () => {
    // All pool recipes are proportional (equivalent), so no macro reason to swap: rotation[0] wins.
    const pool = [proportional('a', 600, 0), proportional('b', 600, 1), proportional('c', 600, 2)];
    const slots: OptimizerSlot[] = [
      { slot: 'BREAKFAST', calorieShare: 0.3, pool },
      { slot: 'LUNCH', calorieShare: 0.35, pool: pool.map((r, i) => ({ ...r, id: 'l' + r.id, rotationIndex: i })) },
      { slot: 'DINNER', calorieShare: 0.35, pool: pool.map((r, i) => ({ ...r, id: 'd' + r.id, rotationIndex: i })) },
    ];
    const result = optimizeMealPlan(slots, targets);
    expect(result[0].recipeId).toBe('a'); // rotation[0]
  });

  it('swaps a fat-dense rotated pick for a leaner option to fix an out-of-tolerance macro', () => {
    // Single slot that must carry the whole day: a fat-dense rotation pick cannot be fixed by servings,
    // but a lean, proportional option can, so the optimizer swaps to it.
    const mealTarget: MacroTargets = { calories: 600, proteinGrams: 36, carbohydrateGrams: 75, fatGrams: 18, fiberGrams: 8 };
    const fatDense = recipe('fatty', { calories: 600, proteinGrams: 20, carbohydrateGrams: 30, fatGrams: 42 }, 0);
    const lean = recipe('lean', { calories: 600, proteinGrams: 36, carbohydrateGrams: 75, fatGrams: 18, fiberGrams: 8 }, 1);
    const result = optimizeMealPlan([{ slot: 'MEAL', calorieShare: 1, pool: [fatDense, lean] }], mealTarget);
    expect(result[0].recipeId).toBe('lean');
  });

  it('never selects the same recipe in two slots when alternatives exist', () => {
    const shared = [proportional('x', 600, 0), proportional('y', 600, 1)];
    const slots: OptimizerSlot[] = [
      { slot: 'BREAKFAST', calorieShare: 0.5, pool: shared },
      { slot: 'LUNCH', calorieShare: 0.5, pool: shared },
    ];
    const result = optimizeMealPlan(slots, targets);
    expect(result[0].recipeId).not.toBe(result[1].recipeId);
  });

  it('is deterministic for identical inputs', () => {
    const slots: OptimizerSlot[] = [
      { slot: 'BREAKFAST', calorieShare: 0.3, pool: [proportional('b', 540, 0), recipe('b2', { calories: 500, proteinGrams: 40, carbohydrateGrams: 40, fatGrams: 10 }, 1)] },
      { slot: 'LUNCH', calorieShare: 0.35, pool: [proportional('l', 700, 0)] },
      { slot: 'DINNER', calorieShare: 0.35, pool: [proportional('d', 640, 0)] },
    ];
    expect(optimizeMealPlan(slots, targets)).toEqual(optimizeMealPlan(slots, targets));
  });
});
