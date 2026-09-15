import { Injectable } from '@nestjs/common';
import type { DailyScheduleInput, GeneratedDailySchedule, ScheduledMeal, ScheduleRecipe } from './schedule-planner.types';

const mealMinutes: Record<string, number> = { BREAKFAST: 60, LUNCH: 45, SNACK: 20, DINNER: 45, PRE_WORKOUT: 15, POST_WORKOUT: 30 };

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
    const meals = spaced.map((meal) => this.recipeFor(meal.slot, meal.time, Math.round(input.targets.calories * meal.share / totalShares), input, recipes));
    return { meals };
  }

  private recipeFor(slot: string, scheduledMinutes: number, targetCalories: number, input: DailyScheduleInput, recipes: ScheduleRecipe[]): ScheduledMeal {
    const compatible = recipes.filter((recipe) => dietCompatible(recipe.dietType, input.dietType) && !recipe.allergens.some((allergen) => input.restrictions.includes(allergen)));
    const categoryMatches = compatible.filter((recipe) => recipe.mealCategory === slot);
    const pool = (categoryMatches.length ? categoryMatches : compatible).sort((left, right) => Math.abs(left.calories - targetCalories) - Math.abs(right.calories - targetCalories) || left.name.localeCompare(right.name));
    if (!pool.length) throw new SchedulePlanningError(`No recipes match the user's diet and restrictions for ${slot}.`);
    return { slot, scheduledMinutes, targetCalories, recipeId: pool[0].id, alternativeRecipeIds: pool.slice(1, 3).map((recipe) => recipe.id) };
  }
}

export class SchedulePlanningError extends Error {}

export function parseTime(value: string): number { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new SchedulePlanningError('Times must use HH:MM format.'); return Number(match[1]) * 60 + Number(match[2]); }
function nextDayTime(time: number, wake: number): number { return time <= wake ? time + 1440 : time; }
function alignTime(time: number, wake: number, sleep: number): number { const aligned = time < wake ? time + 1440 : time; if (aligned < wake || aligned > sleep) throw new SchedulePlanningError('Workout time must fall between wake and sleep.'); return aligned; }
function dietCompatible(recipeDiet: string, userDiet: string): boolean { return userDiet === 'Vegan' ? recipeDiet === 'VEGAN' : userDiet === 'Vegetarian' ? ['VEGETARIAN', 'VEGAN'].includes(recipeDiet) : ['VEGETARIAN', 'VEGAN', 'NON_VEGETARIAN'].includes(recipeDiet); }