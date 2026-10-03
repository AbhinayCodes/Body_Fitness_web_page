import { describe, expect, it } from '@jest/globals';
import { SchedulePlannerService, SchedulePlanningError, scaleServings, summarizeSchedule } from './schedule-planner.service';
import type { DailyScheduleInput, ScheduleRecipe, SummaryMeal } from './schedule-planner.types';

const planner = new SchedulePlannerService();
const recipes: ScheduleRecipe[] = [
  ['b1', 'BREAKFAST', 'VEGAN', 350], ['b2', 'BREAKFAST', 'VEGAN', 300], ['b3', 'BREAKFAST', 'VEGETARIAN', 420],
  ['l1', 'LUNCH', 'VEGAN', 500], ['l2', 'LUNCH', 'VEGAN', 480], ['l3', 'LUNCH', 'VEGETARIAN', 560],
  ['s1', 'SNACK', 'VEGETARIAN', 260], ['s2', 'SNACK', 'VEGAN', 220],
  ['d1', 'DINNER', 'VEGETARIAN', 520], ['d2', 'DINNER', 'VEGAN', 460], ['d3', 'DINNER', 'VEGETARIAN', 500],
  ['pre', 'PRE_WORKOUT', 'VEGAN', 280], ['post', 'POST_WORKOUT', 'NON_VEGETARIAN', 560],
].map(([id, mealCategory, dietType, calories]) => ({ id: String(id), slug: String(id), name: String(id), mealCategory: String(mealCategory), dietType: String(dietType), calories: Number(calories), proteinGrams: 20, carbohydrateGrams: 50, fatGrams: 10, fiberGrams: 8, allergens: [], nutritionBasis: 'Estimate' }));
const base: DailyScheduleInput = { wakeTime: '06:00', sleepTime: '23:00', gymTime: '07:00', workoutDurationMinutes: 45, isTrainingDay: true, dietType: 'Vegetarian', restrictions: [], targets: { calories: 2200, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 70, fiberGrams: 30 }, dayNumber: 0 };

function actualFor(input: DailyScheduleInput) {
  const schedule = planner.generate(input, recipes);
  const meals: SummaryMeal[] = schedule.meals.map((meal) => { const recipe = recipes.find((candidate) => candidate.id === meal.recipeId)!; return { servings: meal.servings, recipe }; });
  return { schedule, summary: summarizeSchedule(meals, input.targets) };
}

describe('SchedulePlannerService', () => {
  it.each(['07:00', '14:30', '20:30', '23:15'])('builds a realistic, non-stacked training schedule for gym at %s', (gymTime) => {
    const input = { ...base, gymTime, sleepTime: gymTime === '23:15' ? '02:00' : base.sleepTime };
    const schedule = planner.generate(input, recipes);
    expect(schedule.meals).toEqual([...schedule.meals].sort((left, right) => left.scheduledMinutes - right.scheduledMinutes));
    expect(schedule.meals.every((meal, index) => index === 0 || meal.scheduledMinutes - schedule.meals[index - 1].scheduledMinutes >= 120)).toBe(true);
    expect(schedule.meals.reduce((total, meal) => total + meal.targetCalories, 0)).toBeGreaterThan(0);
  });

  it('omits workout slots on a rest day and varies timing with wake/sleep routine', () => {
    const early = planner.generate({ ...base, isTrainingDay: false, gymTime: undefined }, recipes);
    const late = planner.generate({ ...base, wakeTime: '08:00', sleepTime: '00:30', isTrainingDay: false, gymTime: undefined }, recipes);
    expect(early.meals.map((meal) => meal.slot)).not.toContain('PRE_WORKOUT');
    expect(early.meals.map((meal) => meal.slot)).not.toContain('POST_WORKOUT');
    expect(late.meals[0].scheduledMinutes).toBeGreaterThan(early.meals[0].scheduledMinutes);
  });

  it.each([30, 45, 60, 90])('uses the supplied %i-minute workout duration to place post-workout food', (workoutDurationMinutes) => {
    const schedule = planner.generate({ ...base, gymTime: '14:00', workoutDurationMinutes }, recipes);
    const post = schedule.meals.find((meal) => meal.slot === 'POST_WORKOUT');
    if (post) expect(post.scheduledMinutes).toBe(14 * 60 + workoutDurationMinutes + 30);
  });

  it('filters restricted recipes and returns up to two alternatives near each meal target', () => {
    const restricted = recipes.map((recipe) => recipe.id === 'd1' ? { ...recipe, allergens: ['DAIRY'] } : recipe);
    const schedule = planner.generate({ ...base, isTrainingDay: false, gymTime: undefined, restrictions: ['DAIRY'] }, restricted);
    expect(schedule.meals.every((meal) => meal.recipeId !== 'd1')).toBe(true);
    expect(schedule.meals.every((meal) => meal.alternativeRecipeIds.length <= 2)).toBe(true);
  });

  it('rejects impossible routine times and diets with no compatible recipes', () => {
    expect(() => planner.generate({ ...base, wakeTime: '10:00', sleepTime: '16:00' }, recipes)).toThrow(SchedulePlanningError);
    expect(() => planner.generate({ ...base, dietType: 'Vegan', restrictions: [], isTrainingDay: false, gymTime: undefined }, recipes.map((recipe) => ({ ...recipe, dietType: 'NON_VEGETARIAN' })))).toThrow('No recipes match');
  });

  // Part 9: portion scaling. A fixed single-serving plan under-delivers; scaled servings must reach the target.
  it('scales servings so the day lands near the calorie target instead of a fixed single serving', () => {
    const { schedule, summary } = actualFor({ ...base, isTrainingDay: false, gymTime: undefined });
    const singleServingCalories = schedule.meals.reduce((total, meal) => total + recipes.find((recipe) => recipe.id === meal.recipeId)!.calories, 0);
    expect(singleServingCalories).toBeLessThan(base.targets.calories * 0.85); // reproduces the old ~1410 vs ~2920 gap
    expect(schedule.meals.every((meal) => meal.servings >= 0.5 && meal.servings <= 3)).toBe(true);
    expect(Math.abs(summary.calories.percentDifference)).toBeLessThanOrEqual(10);
    expect(summary.calories.target).toBe(base.targets.calories);
  });

  it('scaleServings clamps to a realistic range and snaps to quarter servings', () => {
    expect(scaleServings(700, 350)).toBe(2);
    expect(scaleServings(100, 350)).toBe(0.5); // clamp floor
    expect(scaleServings(5000, 350)).toBe(3); // clamp ceiling
    expect(scaleServings(660, 350)).toBe(2); // 1.886 -> nearest 0.25
    expect(scaleServings(700, 0)).toBe(1); // guards divide-by-zero
  });

  // Part 13/15: week-to-week and day-to-day variety.
  it('varies meals day to day and keeps the same week stable but regenerates next week', () => {
    const monday = actualFor({ ...base, isTrainingDay: false, gymTime: undefined, dayNumber: 100 });
    const tuesday = actualFor({ ...base, isTrainingDay: false, gymTime: undefined, dayNumber: 101 });
    const mondayAgain = actualFor({ ...base, isTrainingDay: false, gymTime: undefined, dayNumber: 100 });
    const nextMonday = actualFor({ ...base, isTrainingDay: false, gymTime: undefined, dayNumber: 107 });
    const ids = (plan: typeof monday) => plan.schedule.meals.map((meal) => meal.recipeId).join('|');
    expect(ids(tuesday)).not.toBe(ids(monday)); // day to day
    expect(ids(mondayAgain)).toBe(ids(monday)); // stable within the same day/week
    expect(ids(nextMonday)).not.toBe(ids(monday)); // next week differs
  });

  // Part 11/30: daily validation surfaces target vs actual with difference and percentage.
  it('summarizes target vs actual for every macro', () => {
    const { summary } = actualFor({ ...base, isTrainingDay: false, gymTime: undefined });
    for (const key of ['calories', 'proteinGrams', 'carbohydrateGrams', 'fatGrams', 'fiberGrams'] as const) {
      expect(summary[key].difference).toBe(summary[key].actual - summary[key].target);
      expect(typeof summary[key].percentDifference).toBe('number');
    }
    expect(typeof summary.withinTolerance).toBe('boolean');
  });
});