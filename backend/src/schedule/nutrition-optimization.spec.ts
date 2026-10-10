import { describe, expect, it } from '@jest/globals';
import { SchedulePlannerService, summarizeSchedule, MACRO_TOLERANCES } from './schedule-planner.service';
import type { DailyScheduleInput, ScheduleRecipe, SummaryMeal } from './schedule-planner.types';
import { NutritionCalculationService } from '../nutrition/nutrition-calculation.service';
import type { NutritionCalculationInput, NutritionTargets } from '../nutrition/nutrition-calculation.types';
import { recipeCatalogSeeds, ingredientCatalogSeeds } from '../../prisma/recipe-catalog.seed';
import { computeRecipeNutritionFromIngredients, macroImpliedCalories, type IngredientReference } from '../nutrition/recipe-nutrition';

const planner = new SchedulePlannerService();
const calculator = new NutritionCalculationService();

// Real production catalog mapped into the planner's recipe shape.
const catalog: ScheduleRecipe[] = recipeCatalogSeeds.map((recipe) => ({
  id: recipe.slug, slug: recipe.slug, name: recipe.name, mealCategory: recipe.mealCategory, dietType: recipe.dietType,
  calories: recipe.calories, proteinGrams: recipe.proteinGrams, carbohydrateGrams: recipe.carbohydrateGrams, fatGrams: recipe.fatGrams, fiberGrams: recipe.fiberGrams,
  allergens: recipe.allergens, ingredientNames: recipe.ingredients.map((entry) => entry[0]), tags: recipe.tags, regionalCuisines: recipe.regionalCuisines, nutritionBasis: 'Estimate',
}));

const ingredientReferences = new Map<string, IngredientReference>(ingredientCatalogSeeds.map((entry) => [entry[0], { caloriesPer100g: entry[2], proteinGramsPer100g: entry[3], carbohydrateGramsPer100g: entry[4], fatGramsPer100g: entry[5], fiberGramsPer100g: entry[6] }]));

const baseProfile: NutritionCalculationInput = {
  age: 25, sex: 'MALE', heightCm: 180, weightKg: 75, trainingDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
  workoutDurationMinutes: 60, trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', primaryGoal: 'Build muscle', dailyActivity: 'MODERATELY_ACTIVE',
};

function targetsFor(overrides: Partial<NutritionCalculationInput>): NutritionTargets {
  const result = calculator.calculate({ ...baseProfile, ...overrides });
  if (result.status !== 'READY' || !result.targets) throw new Error(`Expected READY targets, got ${result.status}`);
  return result.targets;
}

function planFor(opts: { targets: NutritionTargets; dietType: string; restrictions?: string[]; dayNumber?: number; mealsPerDay?: number; catalog?: ScheduleRecipe[] }) {
  const input: DailyScheduleInput = {
    wakeTime: '06:00', sleepTime: '22:30', workoutDurationMinutes: 60, isTrainingDay: false,
    dietType: opts.dietType, restrictions: opts.restrictions ?? [], targets: opts.targets, dayNumber: opts.dayNumber ?? 0, mealsPerDay: opts.mealsPerDay,
  };
  const used = opts.catalog ?? catalog;
  const schedule = planner.generate(input, used);
  const meals: SummaryMeal[] = schedule.meals.map((meal) => ({ servings: meal.servings, recipe: used.find((recipe) => recipe.id === meal.recipeId)! }));
  const summary = summarizeSchedule(meals, opts.targets);
  return { schedule, summary, recipes: schedule.meals.map((meal) => used.find((recipe) => recipe.id === meal.recipeId)!) };
}

describe('catalog data integrity', () => {
  it('every recipe is internally macro-consistent (P*4 + C*4 + F*9 within 8% of stored calories)', () => {
    const offenders = recipeCatalogSeeds.filter((recipe) => Math.abs(macroImpliedCalories(recipe) - recipe.calories) / recipe.calories > 0.08).map((recipe) => recipe.slug);
    expect(offenders).toEqual([]);
  });

  it('every recipe ingredient resolves to reference nutrition (nothing fabricated or missing)', () => {
    for (const recipe of recipeCatalogSeeds) {
      const computed = computeRecipeNutritionFromIngredients(recipe.ingredients.map(([name, quantity, unit]) => ({ name, quantity, unit })), ingredientReferences);
      expect(computed.missingIngredients).toEqual([]);
    }
  });

  it('keeps every recipe within 45% of its ingredient-derived calorie estimate (no unreliable proxies)', () => {
    // Phase 2.1 corrected the two prior offenders (vegetable-poha, sprouts-chaat) so their stored
    // calories now agree with their ingredient lists. No recipe may drift >45% from the estimate.
    const grossOffenders = recipeCatalogSeeds.filter((recipe) => {
      const computed = computeRecipeNutritionFromIngredients(recipe.ingredients.map(([name, quantity, unit]) => ({ name, quantity, unit })), ingredientReferences);
      return Math.abs(computed.calories - recipe.calories) / recipe.calories > 0.45;
    }).map((recipe) => recipe.slug);
    expect(grossOffenders).toEqual([]);
  });
});

describe('macro optimization across profiles and diets', () => {
  const scenarios: Array<{ name: string; overrides: Partial<NutritionCalculationInput>; dietType: string }> = [
    { name: 'muscle / vegetarian (the F2 regression profile)', overrides: {}, dietType: 'Vegetarian' },
    { name: 'muscle / vegan', overrides: {}, dietType: 'Vegan' },
    { name: 'muscle / eggetarian', overrides: {}, dietType: 'Eggetarian' },
    { name: 'muscle / non-vegetarian', overrides: {}, dietType: 'Non-vegetarian' },
    { name: 'fat loss / vegetarian', overrides: { primaryGoal: 'Lose fat' }, dietType: 'Vegetarian' },
    { name: 'maintain / vegan', overrides: { primaryGoal: 'Maintain fitness' }, dietType: 'Vegan' },
    { name: 'older lighter female fat loss / non-veg', overrides: { sex: 'FEMALE', age: 45, heightCm: 160, weightKg: 58, primaryGoal: 'Lose fat', dailyActivity: 'LIGHTLY_ACTIVE' }, dietType: 'Non-vegetarian' },
    { name: 'heavy very-active male / vegetarian', overrides: { weightKg: 95, dailyActivity: 'VERY_ACTIVE' }, dietType: 'Vegetarian' },
  ];

  it.each(scenarios)('keeps calories+protein on target and never falsely reports success: $name', ({ overrides, dietType }) => {
    const targets = targetsFor(overrides);
    const { summary } = planFor({ targets, dietType });
    // Core adherence: calories and protein must be within tolerance for the catalog to be usable.
    expect(Math.abs(summary.calories.percentDifference)).toBeLessThanOrEqual(MACRO_TOLERANCES.calories);
    expect(Math.abs(summary.proteinGrams.percentDifference)).toBeLessThanOrEqual(MACRO_TOLERANCES.proteinGrams);
    expect(summary.status).not.toBe('NEEDS_REVIEW');
    // Honesty: MEETS_TARGETS is only claimed when every macro is actually within tolerance.
    if (summary.status === 'MEETS_TARGETS') expect(summary.unmetTargets).toEqual([]);
    else expect(summary.unmetTargets.length).toBeGreaterThan(0);
  });

  it('fixes the F2 fat overshoot for the muscle/vegetarian profile (was +46% on the old engine)', () => {
    const targets = targetsFor({});
    const { summary } = planFor({ targets, dietType: 'Vegetarian' });
    expect(Math.abs(summary.fatGrams.percentDifference)).toBeLessThanOrEqual(MACRO_TOLERANCES.fatGrams);
  });

  it('keeps all five macros measured and consistent with the chosen portions', () => {
    const targets = targetsFor({});
    const { summary } = planFor({ targets, dietType: 'Vegetarian' });
    for (const key of ['calories', 'proteinGrams', 'carbohydrateGrams', 'fatGrams', 'fiberGrams'] as const) {
      expect(summary[key].difference).toBe(summary[key].actual - summary[key].target);
    }
  });
});

describe('safety is never sacrificed for macros', () => {
  it('excludes a restricted allergen across the week even while optimising macros', () => {
    const targets = targetsFor({});
    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const { recipes } = planFor({ targets, dietType: 'Non-vegetarian', restrictions: ['dairy'], dayNumber });
      for (const recipe of recipes) expect(recipe.allergens).not.toContain('DAIRY');
    }
  });

  it('eggetarian optimisation never selects meat or fish', () => {
    const targets = targetsFor({});
    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const { recipes } = planFor({ targets, dietType: 'Eggetarian', dayNumber });
      for (const recipe of recipes) {
        expect(recipe.ingredientNames).not.toContain('Chicken breast, cooked');
        expect(recipe.ingredientNames).not.toContain('Fish, cooked');
      }
    }
  });
});

describe('weekly variety and stability', () => {
  it('produces varied breakfasts across the week while staying reproducible for the same day', () => {
    const targets = targetsFor({});
    const breakfasts = new Set<string>();
    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const { schedule } = planFor({ targets, dietType: 'Vegetarian', dayNumber });
      breakfasts.add(schedule.meals.find((meal) => meal.slot === 'BREAKFAST')!.recipeId);
    }
    expect(breakfasts.size).toBeGreaterThanOrEqual(4); // meaningful variation, not the same dish daily
    const first = planFor({ targets, dietType: 'Vegetarian', dayNumber: 3 });
    const again = planFor({ targets, dietType: 'Vegetarian', dayNumber: 3 });
    expect(first.schedule.meals).toEqual(again.schedule.meals); // stable on reload
  });
});

describe('infeasible catalog is reported honestly', () => {
  it('does not claim MEETS_TARGETS when a tiny fat-dense catalog cannot match the macros', () => {
    const targets = targetsFor({});
    const tiny: ScheduleRecipe[] = [
      { id: 'only-b', slug: 'only-b', name: 'Fatty Breakfast', mealCategory: 'BREAKFAST', dietType: 'VEGETARIAN', calories: 500, proteinGrams: 12, carbohydrateGrams: 20, fatGrams: 40, fiberGrams: 2, allergens: [], ingredientNames: [], nutritionBasis: 'x' },
      { id: 'only-l', slug: 'only-l', name: 'Fatty Lunch', mealCategory: 'LUNCH', dietType: 'VEGETARIAN', calories: 520, proteinGrams: 12, carbohydrateGrams: 20, fatGrams: 42, fiberGrams: 2, allergens: [], ingredientNames: [], nutritionBasis: 'x' },
      { id: 'only-d', slug: 'only-d', name: 'Fatty Dinner', mealCategory: 'DINNER', dietType: 'VEGETARIAN', calories: 520, proteinGrams: 12, carbohydrateGrams: 20, fatGrams: 42, fiberGrams: 2, allergens: [], ingredientNames: [], nutritionBasis: 'x' },
    ];
    const { summary } = planFor({ targets, dietType: 'Vegetarian', catalog: tiny });
    expect(summary.status).not.toBe('MEETS_TARGETS');
    expect(summary.unmetTargets.length).toBeGreaterThan(0);
  });
});
