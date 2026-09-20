import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { FitnessRepository } from '../data-access/fitness.repository';
import type { WorkoutHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateWorkoutDto } from './dto/create-workout.dto';
import type { UpdateWorkoutProgressDto } from './dto/update-workout-progress.dto';

@Injectable()
export class WorkoutService {
  constructor(private readonly repository: FitnessRepository, private readonly prisma: PrismaService) {}

  async createWorkout(userId: string, payload: CreateWorkoutDto): Promise<WorkoutHistoryEntry> {
    return this.repository.createWorkout(userId, payload);
  }

  async updateTodayProgress(userId: string, payload: UpdateWorkoutProgressDto) {
    const planDay = await this.prisma.workoutPlanDay.findFirst({ where: { id: payload.workoutPlanDayId, workoutPlan: { userId } }, include: { exercises: true } });
    if (!planDay) throw new BadRequestException('Workout plan day not found.');
    const validIndexes = new Set(planDay.exercises.map((exercise) => exercise.exerciseOrder));
    if (payload.exercises.some((exercise) => !validIndexes.has(exercise.exerciseIndex))) throw new BadRequestException('Workout progress contains an invalid exercise.');
    const targetSets = new Map(planDay.exercises.map((exercise) => [exercise.exerciseOrder, exercise.sets]));
    if (payload.exercises.some((exercise) => exercise.setsCompleted > targetSets.get(exercise.exerciseIndex)!)) throw new BadRequestException('Completed sets cannot exceed the planned sets for an exercise.');
    const date = new Date();
    const existing = await this.prisma.workoutSession.findFirst({ where: { userId, workoutPlanDayId: planDay.id, date }, select: { id: true } });
    const session = existing
      ? await this.prisma.workoutSession.update({ where: { id: existing.id }, data: { durationMinutes: planDay.estimatedMinutes } })
      : await this.prisma.workoutSession.create({ data: { userId, workoutPlanDayId: planDay.id, date, durationMinutes: planDay.estimatedMinutes } });
    for (const exercise of payload.exercises) await this.prisma.exerciseCompletion.upsert({ where: { workoutSessionId_exerciseIndex: { workoutSessionId: session.id, exerciseIndex: exercise.exerciseIndex } }, update: { setsCompleted: exercise.setsCompleted }, create: { workoutSessionId: session.id, exerciseIndex: exercise.exerciseIndex, setsCompleted: exercise.setsCompleted } });
    return this.prisma.workoutSession.findUniqueOrThrow({ where: { id: session.id }, include: { exercises: { orderBy: { exerciseIndex: 'asc' } } } });
  }
}
