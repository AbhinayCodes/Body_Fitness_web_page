import { Injectable } from '@nestjs/common';
import type { Profile as PrismaProfile } from '@prisma/client';
import type { CreateMealDto } from '../meal/dto/create-meal.dto';
import type { UpdateProfileDto } from '../profile/dto/update-profile.dto';
import type { CreateWorkoutDto } from '../workout/dto/create-workout.dto';
import { DEFAULT_STATE, type FitnessState, type MealHistoryEntry, type Profile, type WorkoutHistoryEntry } from './fitness-state.types';
import { PrismaService } from './prisma.service';

@Injectable()
export class FitnessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getState(userId: string): Promise<FitnessState> {
    const user = await this.getUser(userId);
    return {
      profile: this.toProfile(user.profile),
      mealDone: user.mealDone,
      workoutHistory: user.workoutSessions.map((session) => ({
        date: this.toDateString(session.date),
        exercises: session.exercises.map((exercise) => exercise.exerciseIndex),
        durationMinutes: session.durationMinutes,
      })),
      mealHistory: user.mealLogs.map((meal) => ({ date: this.toDateString(meal.date), meal: meal.meal })),
    };
  }

  async updateProfile(userId: string, payload: UpdateProfileDto): Promise<Profile> {
    const user = await this.getUser(userId);
    const profile = await this.prisma.profile.update({
      where: { userId: user.id },
      data: payload,
    });
    return this.toProfile(profile);
  }

  async createWorkout(userId: string, payload: CreateWorkoutDto): Promise<WorkoutHistoryEntry> {
    const user = await this.getUser(userId);
    const workout = await this.prisma.workoutSession.create({
      data: {
        userId: user.id,
        date: new Date(),
        durationMinutes: payload.durationMinutes ?? 52,
        exercises: { create: (payload.exercises ?? []).map((exerciseIndex) => ({ exerciseIndex })) },
      },
      include: { exercises: { orderBy: { exerciseIndex: 'asc' } } },
    });
    return { date: this.toDateString(workout.date), exercises: workout.exercises.map((exercise) => exercise.exerciseIndex), durationMinutes: workout.durationMinutes };
  }

  async createMeal(userId: string, payload: CreateMealDto): Promise<MealHistoryEntry> {
    const user = await this.getUser(userId);
    const meal = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: user.id }, data: { mealDone: true } });
      return transaction.mealLog.create({ data: { userId: user.id, date: new Date(), meal: payload.meal ?? 'Paneer rice bowl' } });
    });
    return { date: this.toDateString(meal.date), meal: meal.meal };
  }

  private async getUser(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        profile: true,
        workoutSessions: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }], include: { exercises: { orderBy: { exerciseIndex: 'asc' } } } },
        mealLogs: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    });
  }

  private toProfile(profile: PrismaProfile | null): Profile {
    return profile ? { name: profile.name, goal: profile.goal, days: profile.days, diet: profile.diet } : DEFAULT_STATE.profile;
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
