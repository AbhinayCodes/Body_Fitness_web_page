import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { WorkoutPlannerService } from './workout-planner.service';
import type { CatalogExercise, WorkoutPlanningInput } from './workout-planner.types';

@Injectable()
export class WorkoutPlanService {
  constructor(private readonly prisma: PrismaService, private readonly planner: WorkoutPlannerService) {}

  async getPlan(userId: string) {
    const input = await this.inputFromOnboarding(userId);
    const sourceFingerprint = this.planner.fingerprint(input);
    const existing = await this.prisma.workoutPlan.findUnique({ where: { userId_sourceFingerprint: { userId, sourceFingerprint } }, include: planInclude });
    if (existing) return existing;
    const catalog = await this.prisma.exercise.findMany();
    const generated = this.planner.generate(input, catalog as CatalogExercise[]);
    return this.prisma.workoutPlan.create({ data: { userId, sourceFingerprint, goal: generated.goal, experience: generated.experience, durationMinutes: generated.durationMinutes, trainingLocation: generated.trainingLocation, trainingDays: generated.trainingDays, days: { create: generated.days.map((day, dayOrder) => ({ weekday: day.weekday, dayOrder, title: day.title, targetMuscleGroups: day.targetMuscleGroups, estimatedMinutes: day.estimatedMinutes, exercises: { create: day.exercises.map(({ exerciseId, exerciseOrder, sets, reps, restSeconds }) => ({ exerciseId, exerciseOrder, sets, reps, restSeconds })) } })) } }, include: planInclude });
  }

  private async inputFromOnboarding(userId: string): Promise<WorkoutPlanningInput> {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.completed) throw new BadRequestException('Complete onboarding before generating a workout plan.');
    if (!onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingLocation) throw new BadRequestException('Your training profile is incomplete.');
    return { primaryGoal: onboarding.primaryGoal as WorkoutPlanningInput['primaryGoal'], trainingExperience: onboarding.trainingExperience as WorkoutPlanningInput['trainingExperience'], trainingDays: onboarding.trainingDays, workoutDurationMinutes: onboarding.workoutDurationMinutes as WorkoutPlanningInput['workoutDurationMinutes'], trainingLocation: onboarding.trainingLocation as WorkoutPlanningInput['trainingLocation'], equipment: onboarding.equipment };
  }
}

const planInclude = { days: { orderBy: { dayOrder: 'asc' as const }, include: { exercises: { orderBy: { exerciseOrder: 'asc' as const }, include: { exercise: true } } } } };