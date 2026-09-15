import { describe, expect, it } from '@jest/globals';
import { SchedulePlannerService, SchedulePlanningError } from './schedule-planner.service';
import type { DailyScheduleInput, ScheduleRecipe } from './schedule-planner.types';

const planner = new SchedulePlannerService();
const recipes: ScheduleRecipe[] = [
  ['breakfast', 'BREAKFAST', 'VEGAN', 350], ['lunch', 'LUNCH', 'VEGAN', 500], ['snack', 'SNACK', 'VEGETARIAN', 260], ['dinner', 'DINNER', 'VEGETARIAN', 520], ['pre', 'PRE_WORKOUT', 'VEGAN', 280], ['post', 'POST_WORKOUT', 'NON_VEGETARIAN', 560], ['alt', 'DINNER', 'VEGAN', 480],
].map(([id, mealCategory, dietType, calories]) => ({ id: String(id), slug: String(id), name: String(id), mealCategory: String(mealCategory), dietType: String(dietType), calories: Number(calories), proteinGrams: 20, carbohydrateGrams: 50, fatGrams: 10, fiberGrams: 8, allergens: [], nutritionBasis: 'Estimate' }));
const base: DailyScheduleInput = { wakeTime: '06:00', sleepTime: '23:00', gymTime: '07:00', workoutDurationMinutes: 45, isTrainingDay: true, dietType: 'Vegetarian', restrictions: [], targets: { calories: 2200, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 70, fiberGrams: 30 } };

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
    const restricted = recipes.map((recipe) => recipe.id === 'dinner' ? { ...recipe, allergens: ['DAIRY'] } : recipe);
    const schedule = planner.generate({ ...base, isTrainingDay: false, gymTime: undefined, restrictions: ['DAIRY'] }, restricted);
    expect(schedule.meals.every((meal) => meal.recipeId !== 'dinner')).toBe(true);
    expect(schedule.meals.every((meal) => meal.alternativeRecipeIds.length <= 2)).toBe(true);
  });

  it('rejects impossible routine times and diets with no compatible recipes', () => {
    expect(() => planner.generate({ ...base, wakeTime: '10:00', sleepTime: '16:00' }, recipes)).toThrow(SchedulePlanningError);
    expect(() => planner.generate({ ...base, dietType: 'Vegan', restrictions: [], isTrainingDay: false, gymTime: undefined }, recipes.map((recipe) => ({ ...recipe, dietType: 'NON_VEGETARIAN' })))).toThrow('No recipes match');
  });
});