import { Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class TodayService {
  constructor(private readonly prisma: PrismaService, private readonly schedules: ScheduleService, private readonly nutrition: NutritionService) {}

  async get(userId: string) {
    const [profile, schedule, nutrition, activity] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.schedules.getToday(userId),
      this.nutrition.getTargets(userId),
      this.prisma.activitySummary.findFirst({ where: { userId }, orderBy: { recordedAt: 'desc' } }),
    ]);
    if ('status' in schedule) return { status: schedule.status, message: schedule.metadata.message };
    const alternativeIds = schedule.meals.flatMap((meal) => meal.alternativeRecipeIds ?? []);
    const alternatives = alternativeIds.length ? await this.prisma.recipe.findMany({ where: { id: { in: alternativeIds } }, select: { id: true, name: true, calories: true, proteinGrams: true } }) : [];
    const meals = schedule.meals.map((meal) => ({ ...meal, alternatives: (meal.alternativeRecipeIds ?? []).map((recipeId) => alternatives.find((recipe) => recipe.id === recipeId)).filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe)) }));
    const session = schedule.workoutPlanDay ? await this.prisma.workoutSession.findFirst({ where: { userId, workoutPlanDayId: schedule.workoutPlanDay.id, date: schedule.date }, include: { exercises: true } }) : null;
    const completedSets = session?.exercises.reduce((sum, exercise) => sum + exercise.setsCompleted, 0) ?? 0;
    const targetSets = schedule.workoutPlanDay?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
    const eatenMeals = schedule.meals.filter((meal) => meal.eatenAt).length;
    return { status: 'READY', date: schedule.date, profile, nutrition, schedule: { id: schedule.id, isTrainingDay: schedule.isTrainingDay, meals, workout: schedule.workoutPlanDay ? { ...schedule.workoutPlanDay, completedSets, targetSets, completedExerciseSets: session?.exercises.map((exercise) => ({ exerciseIndex: exercise.exerciseIndex, setsCompleted: exercise.setsCompleted })) ?? [], completed: targetSets > 0 && completedSets >= targetSets } : null }, adherence: { mealsCompleted: eatenMeals, mealsPlanned: schedule.meals.length, workoutCompletedSets: completedSets, workoutTargetSets: targetSets, consistencyPercent: Math.round(((schedule.meals.length ? eatenMeals / schedule.meals.length : 1) + (targetSets ? completedSets / targetSets : 1)) / 2 * 100) }, activity };
  }
}