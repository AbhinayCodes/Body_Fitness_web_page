import { Injectable } from '@nestjs/common';
import type { DailyScheduleInput, GeneratedDailySchedule, MacroToleranceFlags, MealPreferences, NutritionPlanStatus, NutritionSummary, ScheduledMeal, ScheduleRecipe, SummaryMeal } from './schedule-planner.types';
import type { NutritionTargets } from '../nutrition/nutrition-calculation.types';
import { dietCompatible, normalizeRestrictions, recipeViolatesAllergens } from '../nutrition/dietary-safety';
import { optimizeMealPlan, type OptimizerRecipe, type OptimizerSlot } from './meal-optimizer';

// Portion scaling keeps servings realistic while still reaching the meal's calorie target.
const MIN_SERVINGS = 0.5;
const MAX_SERVINGS = 3;
const SERVING_STEP = 0.25;
// A small per-slot offset so different meal slots rotate independently through their pools.
const slotSalt: Record<string, number> = { BREAKFAST: 0, LUNCH: 1, SNACK: 2, DINNER: 3, PRE_WORKOUT: 4, POST_WORKOUT: 5 };

// Soft preference biases added to the optimizer score (negative = prefer, positive = avoid).
// Dislikes are strongly discouraged but never override diet/allergen safety (that is a hard pre-filter).
const DISLIKE_PENALTY = 0.5;
const LIKE_BONUS = -0.05;
const CUISINE_BONUS = -0.05;
const FOOD_PREFERENCE_BONUS = -0.03;

// Documented macro tolerances (percent). Calories + protein are the core adherence signals.
export const MACRO_TOLERANCES = { calories: 10, proteinGrams: 15, carbohydrateGrams: 15, fatGrams: 20, fiberGrams: 25 } as const;

@Injectable()
export class SchedulePlannerService {
  generate(input: DailyScheduleInput, recipes: ScheduleRecipe[]): GeneratedDailySchedule {
    const wake = parseTime(input.wakeTime);
    const sleep = nextDayTime(parseTime(input.sleepTime), wake);
    if (sleep - wake < 8 * 60) throw new SchedulePlanningError('Wake and sleep times must allow at least eight hours awake.');
    const candidates: Array<{ slot: string; time: number; share: number }> = [
      { slot: 'BREAKFAST', time: wake + 60, share: 0.27 },
      { slot: 'LUNCH', time: Math.round((wake + sleep) / 2), share: 0.32 },
      { slot: 'DINNER', time: sleep - 120, share: 0.31 },
    ];
    // Honour a higher meal-count preference by adding a mid-afternoon snack when the day is long enough.
    if ((input.mealsPerDay ?? 3) >= 4) {
      const snackTime = Math.round((wake + sleep) / 2) + 210;
      candidates.push({ slot: 'SNACK', time: snackTime, share: 0.12 });
    }
    if (input.isTrainingDay && input.gymTime) {
      const gym = alignTime(parseTime(input.gymTime), wake, sleep);
      const pre = gym - 75;
      const post = gym + input.workoutDurationMinutes + 30;
      if (pre >= wake + 45) candidates.push({ slot: 'PRE_WORKOUT', time: pre, share: 0.12 });
      if (post <= sleep - 45) candidates.push({ slot: 'POST_WORKOUT', time: post, share: 0.25 });
    }
    const spaced = candidates.sort((left, right) => left.time - right.time).filter((candidate, index, list) => index === 0 || candidate.time - list[index - 1].time >= 120);
    const totalShares = spaced.reduce((total, meal) => total + meal.share, 0);
    const restrictions = normalizeRestrictions(input.restrictions).allergens;

    // Build a diet/allergen-safe, rotated candidate pool per slot, then optimise the whole day jointly.
    const optimizerSlots: OptimizerSlot[] = spaced.map((meal) => ({
      slot: meal.slot,
      calorieShare: meal.share / totalShares,
      pool: this.buildPool(meal.slot, input, recipes, restrictions),
    }));
    for (const slot of optimizerSlots) if (!slot.pool.length) throw new SchedulePlanningError(`No recipes match the user's diet and restrictions for ${slot.slot}.`);

    const selections = optimizeMealPlan(optimizerSlots, input.targets);
    const bySlot = new Map(selections.map((selection) => [selection.slot, selection]));
    return {
      meals: spaced.map((meal) => {
        const selection = bySlot.get(meal.slot)!;
        return { slot: meal.slot, scheduledMinutes: meal.time, targetCalories: Math.round((input.targets.calories * meal.share) / totalShares), recipeId: selection.recipeId, servings: selection.servings, alternativeRecipeIds: selection.alternativeRecipeIds };
      }),
    };
  }

  private buildPool(slot: string, input: DailyScheduleInput, recipes: ScheduleRecipe[], restrictions: ReturnType<typeof normalizeRestrictions>['allergens']): OptimizerRecipe[] {
    const compatible = recipes.filter((recipe) => dietCompatible(recipe, input.dietType) && !recipeViolatesAllergens(recipe, restrictions));
    const categoryMatches = compatible.filter((recipe) => recipe.mealCategory === slot);
    const base = (categoryMatches.length ? categoryMatches : compatible).slice().sort((left, right) => left.name.localeCompare(right.name));
    if (!base.length) return [];
    // Rotate by the day number so meals vary day to day and week to week while staying stable within a day.
    const start = ((input.dayNumber + (slotSalt[slot] ?? 0)) % base.length + base.length) % base.length;
    const rotated = base.slice(start).concat(base.slice(0, start));
    // Keep rotation order, but push disliked recipes to the back so they are only a last resort.
    const withBias = rotated.map((recipe) => ({ recipe, bias: preferenceBias(recipe, input.preferences) }));
    const ordered = [...withBias.filter((entry) => entry.bias <= 0), ...withBias.filter((entry) => entry.bias > 0)];
    return ordered.map((entry, rotationIndex) => ({
      id: entry.recipe.id,
      calories: entry.recipe.calories,
      proteinGrams: Number(entry.recipe.proteinGrams),
      carbohydrateGrams: Number(entry.recipe.carbohydrateGrams),
      fatGrams: Number(entry.recipe.fatGrams),
      fiberGrams: Number(entry.recipe.fiberGrams),
      rotationIndex,
      preferenceBias: entry.bias,
    }));
  }
}

function matchesAny(haystack: string[], needles: string[]): boolean {
  if (!needles.length) return false;
  const lowered = haystack.map((item) => item.toLowerCase());
  return needles.some((needle) => { const n = needle.trim().toLowerCase(); return n.length > 1 && lowered.some((item) => item.includes(n) || n.includes(item)); });
}

// Soft, additive preference bias. Never excludes a safe recipe; only nudges ranking.
function preferenceBias(recipe: ScheduleRecipe, preferences?: MealPreferences): number {
  if (!preferences) return 0;
  const text = [recipe.name, ...(recipe.tags ?? [])];
  let bias = 0;
  if (matchesAny(text, preferences.dislikes)) bias += DISLIKE_PENALTY;
  if (matchesAny(text, preferences.likes)) bias += LIKE_BONUS;
  if (recipe.regionalCuisines?.length && matchesAny(recipe.regionalCuisines, preferences.cuisines)) bias += CUISINE_BONUS;
  if (matchesAny(recipe.tags ?? [], preferences.foodPreferences)) bias += FOOD_PREFERENCE_BONUS;
  return bias;
}

export class SchedulePlanningError extends Error {}

export function scaleServings(targetCalories: number, recipeCaloriesPerServing: number): number {
  if (!Number.isFinite(recipeCaloriesPerServing) || recipeCaloriesPerServing <= 0) return 1;
  const raw = targetCalories / recipeCaloriesPerServing;
  const stepped = Math.round(raw / SERVING_STEP) * SERVING_STEP;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(stepped * 100) / 100));
}

export function summarizeSchedule(meals: SummaryMeal[], targets: NutritionTargets): NutritionSummary {
  const totals = meals.reduce((sum, meal) => ({
    calories: sum.calories + meal.recipe.calories * meal.servings,
    proteinGrams: sum.proteinGrams + Number(meal.recipe.proteinGrams) * meal.servings,
    carbohydrateGrams: sum.carbohydrateGrams + Number(meal.recipe.carbohydrateGrams) * meal.servings,
    fatGrams: sum.fatGrams + Number(meal.recipe.fatGrams) * meal.servings,
    fiberGrams: sum.fiberGrams + Number(meal.recipe.fiberGrams) * meal.servings,
  }), { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0 });
  const calories = compare(targets.calories, totals.calories);
  const proteinGrams = compare(targets.proteinGrams, totals.proteinGrams);
  const carbohydrateGrams = compare(targets.carbohydrateGrams, totals.carbohydrateGrams);
  const fatGrams = compare(targets.fatGrams, totals.fatGrams);
  const fiberGrams = compare(targets.fiberGrams, totals.fiberGrams);
  const macrosWithinTolerance: MacroToleranceFlags = {
    calories: Math.abs(calories.percentDifference) <= MACRO_TOLERANCES.calories,
    proteinGrams: Math.abs(proteinGrams.percentDifference) <= MACRO_TOLERANCES.proteinGrams,
    carbohydrateGrams: Math.abs(carbohydrateGrams.percentDifference) <= MACRO_TOLERANCES.carbohydrateGrams,
    fatGrams: Math.abs(fatGrams.percentDifference) <= MACRO_TOLERANCES.fatGrams,
    fiberGrams: Math.abs(fiberGrams.percentDifference) <= MACRO_TOLERANCES.fiberGrams,
  };
  const unmetTargets = (Object.keys(macrosWithinTolerance) as Array<keyof MacroToleranceFlags>).filter((key) => !macrosWithinTolerance[key]);
  // Explicit, honest status: all macros in tolerance vs core (calories+protein) only vs needs review.
  const allWithin = unmetTargets.length === 0;
  const coreWithin = macrosWithinTolerance.calories && macrosWithinTolerance.proteinGrams;
  const status: NutritionPlanStatus = allWithin ? 'MEETS_TARGETS' : coreWithin ? 'USABLE_WITH_DEVIATIONS' : 'NEEDS_REVIEW';
  // Kept for back-compat; now means "every macro within tolerance", not just calories+protein.
  const withinTolerance = allWithin;
  return { calories, proteinGrams, carbohydrateGrams, fatGrams, fiberGrams, withinTolerance, status, macrosWithinTolerance, unmetTargets };
}

function compare(target: number, actualRaw: number): { target: number; actual: number; difference: number; percentDifference: number } {
  const actual = Math.round(actualRaw);
  const difference = actual - target;
  const percentDifference = target > 0 ? Math.round((difference / target) * 1000) / 10 : 0;
  return { target, actual, difference, percentDifference };
}

export function parseTime(value: string): number { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new SchedulePlanningError('Times must use HH:MM format.'); return Number(match[1]) * 60 + Number(match[2]); }
function nextDayTime(time: number, wake: number): number { return time <= wake ? time + 1440 : time; }
function alignTime(time: number, wake: number, sleep: number): number { const aligned = time < wake ? time + 1440 : time; if (aligned < wake || aligned > sleep) throw new SchedulePlanningError('Workout time must fall between wake and sleep.'); return aligned; }