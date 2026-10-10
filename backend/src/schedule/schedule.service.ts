import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../data-access/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { RecipeRepository } from '../recipe/recipe.repository';
import { WorkoutPlanService } from '../workout/workout-plan.service';
import { SchedulePlannerService } from './schedule-planner.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService, private readonly nutrition: NutritionService, private readonly recipes: RecipeRepository, private readonly workouts: WorkoutPlanService, private readonly planner: SchedulePlannerService) {}

  async getToday(userId: string, date = today()) {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.completed || !onboarding.wakeTime || !onboarding.sleepTime || !onboarding.dietType || !onboarding.workoutDurationMinutes) throw new BadRequestException('Complete your routine and food preferences before creating a daily schedule.');
    const nutrition = await this.nutrition.getTargets(userId);
    if (nutrition.status !== 'READY' || !nutrition.targets) return nutrition;
    const workoutPlan = await this.workouts.getPlan(userId);
    const persistedPlan = 'id' in workoutPlan ? workoutPlan : null;
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));
    const workoutPlanDay = persistedPlan?.days.find((day) => day.weekday === weekday);
    const sourceFingerprint = createHash('sha256').update(JSON.stringify({ engine: 'meal-v2-portion-scaling', date, onboarding: onboarding.updatedAt, nutrition: nutrition.targets, workoutPlan: persistedPlan?.id ?? 'medical-clearance' })).digest('hex');
    const existing = await this.prisma.dailySchedule.findUnique({ where: { userId_date_sourceFingerprint: { userId, date: new Date(`${date}T00:00:00.000Z`), sourceFingerprint } }, include: scheduleInclude });
    if (existing) return existing;
    const catalog = await this.recipes.findMany({});
    const plannerRecipes = catalog.map((recipe) => ({ ...recipe, ingredientNames: recipe.ingredients?.map((entry) => entry.ingredient.name) ?? [] }));
    const generated = this.planner.generate({ wakeTime: onboarding.wakeTime, sleepTime: onboarding.sleepTime, gymTime: onboarding.preferredGymTime ?? undefined, workoutDurationMinutes: onboarding.workoutDurationMinutes, isTrainingDay: Boolean(workoutPlanDay), dietType: onboarding.dietType, restrictions: onboarding.foodRestrictions, targets: nutrition.targets, dayNumber: dayNumber(date) }, plannerRecipes);
    return this.prisma.dailySchedule.create({ data: { userId, date: new Date(`${date}T00:00:00.000Z`), sourceFingerprint, isTrainingDay: Boolean(workoutPlanDay), workoutPlanDayId: workoutPlanDay?.id, meals: { create: generated.meals } }, include: scheduleInclude });
  }

  async getWeek(userId: string, startDate = today()) {
    const monday = startOfWeek(startDate);
    const dates = Array.from({ length: 7 }, (_, offset) => addDays(monday, offset));
    const days = [] as Array<{ date: string; schedule: Awaited<ReturnType<ScheduleService['getToday']>> }>;
    for (const date of dates) days.push({ date, schedule: await this.getToday(userId, date) });
    return { startDate: monday, days };
  }

  async replaceMeal(userId: string, scheduleId: string, slot: string, recipeId: string) {
    const meal = await this.prisma.dailyScheduleMeal.findFirst({ where: { dailyScheduleId: scheduleId, slot, dailySchedule: { userId } } });
    if (!meal) throw new NotFoundException('Scheduled meal not found.');
    if (!meal.alternativeRecipeIds.includes(recipeId)) throw new BadRequestException('Choose one of this meal\'s listed alternatives.');
    return this.prisma.dailyScheduleMeal.update({ where: { id: meal.id }, data: { recipeId, alternativeRecipeIds: [meal.recipeId, ...meal.alternativeRecipeIds.filter((id) => id !== recipeId)] }, include: { recipe: true } });
  }

  async markMealEaten(userId: string, scheduleId: string, slot: string) {
    const meal = await this.prisma.dailyScheduleMeal.findFirst({ where: { dailyScheduleId: scheduleId, slot, dailySchedule: { userId } } });
    if (!meal) throw new NotFoundException('Scheduled meal not found.');
    return this.prisma.dailyScheduleMeal.update({ where: { id: meal.id }, data: { eatenAt: new Date() }, include: { recipe: true } });
  }
}

const scheduleInclude = { meals: { orderBy: { scheduledMinutes: 'asc' as const }, include: { recipe: true } }, workoutPlanDay: { include: { exercises: { orderBy: { exerciseOrder: 'asc' as const }, include: { exercise: true } } } } };
function today(): string { return new Date().toISOString().slice(0, 10); }
// Days since the Unix epoch for the given UTC date — the deterministic seed for day-to-day meal rotation.
function dayNumber(date: string): number { return Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 86_400_000); }
function startOfWeek(date: string): string { const base = new Date(`${date}T00:00:00.000Z`); const weekday = (base.getUTCDay() + 6) % 7; base.setUTCDate(base.getUTCDate() - weekday); return base.toISOString().slice(0, 10); }
function addDays(date: string, offset: number): string { const base = new Date(`${date}T00:00:00.000Z`); base.setUTCDate(base.getUTCDate() + offset); return base.toISOString().slice(0, 10); }