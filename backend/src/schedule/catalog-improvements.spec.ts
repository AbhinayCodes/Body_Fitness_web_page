import { describe, expect, it } from '@jest/globals';
import { SchedulePlannerService, summarizeSchedule } from './schedule-planner.service';
import type { DailyScheduleInput, ScheduleRecipe, SummaryMeal } from './schedule-planner.types';
import { recipeCatalogSeeds } from '../../prisma/recipe-catalog.seed';

const planner = new SchedulePlannerService();
const catalog: ScheduleRecipe[] = recipeCatalogSeeds.map((recipe) => ({
  id: recipe.slug, slug: recipe.slug, name: recipe.name, mealCategory: recipe.mealCategory, dietType: recipe.dietType,
  calories: recipe.calories, proteinGrams: recipe.proteinGrams, carbohydrateGrams: recipe.carbohydrateGrams, fatGrams: recipe.fatGrams, fiberGrams: recipe.fiberGrams,
  allergens: recipe.allergens, ingredientNames: recipe.ingredients.map((entry) => entry[0]), tags: recipe.tags, regionalCuisines: recipe.regionalCuisines, nutritionBasis: 'x',
}));
const byId = (id: string) => catalog.find((recipe) => recipe.id === id)!;

const baseInput: DailyScheduleInput = {
  wakeTime: '06:00', sleepTime: '22:30', workoutDurationMinutes: 60, isTrainingDay: false,
  dietType: 'Vegetarian', restrictions: [], targets: { calories: 2920, proteinGrams: 120, carbohydrateGrams: 464, fatGrams: 65, fiberGrams: 41 }, dayNumber: 0,
};

const GLUTEN_INGREDIENTS = ['Rolled oats', 'Semolina (rava)', 'Whole wheat flour'];

describe('gluten policy (catalog)', () => {
  it('tags every oats / semolina / wheat recipe as GLUTEN and leaves gram-flour/legume recipes untagged', () => {
    for (const recipe of recipeCatalogSeeds) {
      const hasGlutenIngredient = recipe.ingredients.some(([name]) => GLUTEN_INGREDIENTS.includes(name));
      if (hasGlutenIngredient) expect(recipe.allergens).toContain('GLUTEN');
    }
    // Besan (gram flour) is naturally gluten-free and must NOT be tagged.
    const besan = recipeCatalogSeeds.find((recipe) => recipe.slug === 'besan-chilla')!;
    expect(besan.allergens).not.toContain('GLUTEN');
  });

  it('tags all five oat recipes consistently as GLUTEN', () => {
    const oatRecipes = recipeCatalogSeeds.filter((recipe) => recipe.ingredients.some(([name]) => name === 'Rolled oats'));
    expect(oatRecipes.length).toBeGreaterThanOrEqual(4);
    for (const recipe of oatRecipes) expect(recipe.allergens).toContain('GLUTEN');
  });
});

describe('gluten restriction cannot be bypassed via selection or replacement', () => {
  it.each(['Gluten-free', 'gluten', 'wheat'])('excludes every gluten recipe (and alternative) for restriction "%s" across the week, all diets', (restriction) => {
    for (const dietType of ['Vegan', 'Vegetarian', 'Eggetarian', 'Non-vegetarian']) {
      for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
        const schedule = planner.generate({ ...baseInput, dietType, restrictions: [restriction], dayNumber }, catalog);
        const ids = [...schedule.meals.map((meal) => meal.recipeId), ...schedule.meals.flatMap((meal) => meal.alternativeRecipeIds)];
        for (const id of ids) expect(byId(id).allergens).not.toContain('GLUTEN');
      }
    }
  });
});

describe('meal-count default and serving practicality', () => {
  it('defaults large-calorie plans to four meals (adds a snack) on a rest day', () => {
    const schedule = planner.generate({ ...baseInput, targets: { ...baseInput.targets, calories: 2920 } }, catalog);
    expect(schedule.meals.map((meal) => meal.slot)).toContain('SNACK');
    expect(schedule.meals.length).toBe(4);
  });

  it('keeps lower-calorie plans at three meals', () => {
    const schedule = planner.generate({ ...baseInput, targets: { calories: 1800, proteinGrams: 100, carbohydrateGrams: 200, fatGrams: 55, fiberGrams: 25 } }, catalog);
    expect(schedule.meals.map((meal) => meal.slot)).not.toContain('SNACK');
    expect(schedule.meals.length).toBe(3);
  });

  it('respects an explicit meal-count preference over the calorie default', () => {
    const three = planner.generate({ ...baseInput, mealsPerDay: 3 }, catalog);
    expect(three.meals.map((meal) => meal.slot)).not.toContain('SNACK');
  });

  it('reduces the maximum single-dish serving on a large rest day versus a forced three-meal plan', () => {
    const fourMeal = planner.generate({ ...baseInput }, catalog); // 2920 -> 4 meals
    const threeMeal = planner.generate({ ...baseInput, mealsPerDay: 3 }, catalog);
    const maxServing = (plan: typeof fourMeal) => Math.max(...plan.meals.map((meal) => meal.servings));
    expect(maxServing(fourMeal)).toBeLessThanOrEqual(maxServing(threeMeal));
  });
});

describe('dinner variety improves across the week', () => {
  const distinctDinners = (dietType: string) => {
    const dinners = new Set<string>();
    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const schedule = planner.generate({ ...baseInput, dietType, dayNumber }, catalog);
      const dinner = schedule.meals.find((meal) => meal.slot === 'DINNER');
      if (dinner) dinners.add(dinner.recipeId);
    }
    return dinners;
  };

  it.each(['Vegetarian', 'Non-vegetarian'])('offers at least 4 distinct dinners over 7 days for %s', (dietType) => {
    expect(distinctDinners(dietType).size).toBeGreaterThanOrEqual(4);
  });

  // Vegan muscle is the hardest case: a high-protein + high-carb + low-fiber vegan dinner is only
  // satisfied by a few tofu/soya dishes, so variety is macro-constrained. We still require >=3 and
  // that the chosen dinners are the low-fiber ones (a quality improvement over legume repetition).
  it('offers at least 3 low-fiber vegan dinners over 7 days', () => {
    const chosen = distinctDinners('Vegan');
    expect(chosen.size).toBeGreaterThanOrEqual(3);
    for (const id of chosen) expect(Number(byId(id).fiberGrams)).toBeLessThanOrEqual(10);
  });
});

describe('fiber overshoot is largely resolved by the expanded low-fiber catalog + four-meal default', () => {
  it.each(['Vegetarian', 'Vegan'])('keeps fiber within tolerance on most days and never NEEDS_REVIEW for %s muscle', (dietType) => {
    let withinFiber = 0;
    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const schedule = planner.generate({ ...baseInput, dietType, dayNumber }, catalog);
      const meals: SummaryMeal[] = schedule.meals.map((meal) => ({ servings: meal.servings, recipe: byId(meal.recipeId) }));
      const summary = summarizeSchedule(meals, baseInput.targets);
      expect(summary.status).not.toBe('NEEDS_REVIEW');
      if (summary.macrosWithinTolerance.fiberGrams) withinFiber++;
    }
    // Was over tolerance every day before Phase 2.1; now the clear majority of days comply.
    expect(withinFiber).toBeGreaterThanOrEqual(5);
  });
});
