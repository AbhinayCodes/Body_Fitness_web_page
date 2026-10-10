import { Injectable } from '@nestjs/common';
import type { DailyScheduleInput, GeneratedDailySchedule, NutritionSummary, ScheduledMeal, ScheduleRecipe, SummaryMeal } from './schedule-planner.types';
import type { NutritionTargets } from '../nutrition/nutrition-calculation.types';
import { dietCompatible, normalizeRestrictions, recipeViolatesAllergens } from '../nutrition/dietary-safety';

// Portion scaling keeps servings realistic while still reaching the meal's calorie target.
const MIN_SERVINGS = 0.5;
const MAX_SERVINGS = 3;
const SERVING_STEP = 0.25;
// A small per-slot offset so different meal slots rotate independently through their pools.
const slotSalt: Record<string, number> = { BREAKFAST: 0, LUNCH: 1, SNACK: 2, DINNER: 3, PRE_WORKOUT: 4, POST_WORKOUT: 5 };

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
    const usedRecipeIds = new Set<string>();
    const meals = spaced.map((meal) => this.recipeFor(meal.slot, meal.time, Math.round(input.targets.calories * meal.share / totalShares), input, recipes, restrictions, usedRecipeIds));
    return { meals };
  }

  private recipeFor(slot: string, scheduledMinutes: number, targetCalories: number, input: DailyScheduleInput, recipes: ScheduleRecipe[], restrictions: ReturnType<typeof normalizeRestrictions>['allergens'], usedRecipeIds: Set<string>): ScheduledMeal {
    const compatible = recipes.filter((recipe) => dietCompatible(recipe, input.dietType) && !recipeViolatesAllergens(recipe, restrictions));
    const categoryMatches = compatible.filter((recipe) => recipe.mealCategory === slot);
    // Deterministic base order so the same inputs always produce the same plan within a day.
    const pool = (categoryMatches.length ? categoryMatches : compatible).slice().sort((left, right) => left.name.localeCompare(right.name));
    if (!pool.length) throw new SchedulePlanningError(`No recipes match the user's diet and restrictions for ${slot}.`);
    // Rotate the pool by the day number so meals vary day to day and week to week while staying stable within a day.
    const available = pool.filter((recipe) => !usedRecipeIds.has(recipe.id));
    const rotatable = available.length ? available : pool;
    const start = ((input.dayNumber + (slotSalt[slot] ?? 0)) % rotatable.length + rotatable.length) % rotatable.length;
    const ordered = rotatable.slice(start).concat(rotatable.slice(0, start));
    const chosen = ordered[0];
    usedRecipeIds.add(chosen.id);
    const servings = scaleServings(targetCalories, chosen.calories);
    const alternativeRecipeIds = ordered.slice(1, 3).map((recipe) => recipe.id);
    return { slot, scheduledMinutes, targetCalories, recipeId: chosen.id, servings, alternativeRecipeIds };
  }
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
  // Calories and protein are the primary adherence signals; +/-10% is the documented tolerance.
  const withinTolerance = Math.abs(calories.percentDifference) <= 10 && Math.abs(proteinGrams.percentDifference) <= 15;
  return { calories, proteinGrams, carbohydrateGrams, fatGrams, fiberGrams, withinTolerance };
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