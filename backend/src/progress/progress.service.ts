import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import type { CreateCheckInDto } from './dto/create-check-in.dto';
import type { CreateExercisePerformanceDto } from './dto/create-exercise-performance.dto';
import type { UpdateProgressSettingsDto } from './dto/update-progress-settings.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async createCheckIn(userId: string, payload: CreateCheckInDto) {
    const measurements = payload.measurements ?? [];
    if (new Set(measurements.map((measurement) => measurement.type)).size !== measurements.length) throw new BadRequestException('Each measurement type can be recorded once per check-in.');
    return this.prisma.progressCheckIn.upsert({ where: { userId_recordedAt: { userId, recordedAt: new Date(payload.recordedAt) } }, update: { weightKg: payload.weightKg, measurements: { deleteMany: {}, create: measurements } }, create: { userId, recordedAt: new Date(payload.recordedAt), weightKg: payload.weightKg, measurements: { create: measurements } }, include: { measurements: true } });
  }

  async updateSettings(userId: string, payload: UpdateProgressSettingsDto) {
    return this.prisma.progressSettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } });
  }

  async logPerformance(userId: string, payload: CreateExercisePerformanceDto) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: payload.exerciseId }, select: { id: true } });
    if (!exercise) throw new BadRequestException('Exercise not found.');
    return this.prisma.exercisePerformance.create({ data: { userId, exerciseId: exercise.id, recordedAt: new Date(payload.recordedAt), sets: payload.sets, reps: payload.reps, weightKg: payload.weightKg } });
  }

  async getSummary(userId: string) {
    const [settings, checkIns, schedules, sessions, performances] = await Promise.all([
      this.prisma.progressSettings.findUnique({ where: { userId } }),
      this.prisma.progressCheckIn.findMany({ where: { userId }, orderBy: { recordedAt: 'asc' }, include: { measurements: true } }),
      this.prisma.dailySchedule.findMany({ where: { userId, date: { gte: daysAgo(28) } }, include: { meals: true, workoutPlanDay: true } }),
      this.prisma.workoutSession.findMany({ where: { userId, date: { gte: daysAgo(28) }, workoutPlanDayId: { not: null } }, include: { exercises: true, workoutPlanDay: { include: { exercises: true } } } }),
      this.prisma.exercisePerformance.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' }, take: 20, include: { exercise: { select: { name: true } } } }),
    ]);
    const last = checkIns.at(-1);
    const previous = checkIns.at(-2);
    const dueDate = last ? addDays(last.recordedAt, settings?.checkInFrequencyDays ?? 7) : new Date();
    const plannedWorkouts = schedules.filter((schedule) => schedule.workoutPlanDay).length;
    const completedWorkouts = sessions.filter((session) => {
      const targetSets = session.workoutPlanDay?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
      const completedSets = session.exercises.reduce((sum, exercise) => sum + exercise.setsCompleted, 0);
      return targetSets > 0 && completedSets >= targetSets;
    }).length;
    const plannedMeals = schedules.reduce((total, schedule) => total + schedule.meals.length, 0);
    const eatenMeals = schedules.reduce((total, schedule) => total + schedule.meals.filter((meal) => meal.eatenAt).length, 0);
    return { checkIn: { frequencyDays: settings?.checkInFrequencyDays ?? 7, due: dueDate <= new Date(), dueDate, latest: last ?? null, previous: previous ?? null, weightChangeKg: last && previous ? round(Number(last.weightKg) - Number(previous.weightKg)) : null, note: 'Weight and measurements are observations. They do not establish body-composition or health changes.' }, weightTrend: checkIns.map((checkIn) => ({ date: checkIn.recordedAt, weightKg: Number(checkIn.weightKg) })), consistency: { plannedWorkouts, completedWorkouts, workoutCompletionPercent: plannedWorkouts ? Math.round(completedWorkouts / plannedWorkouts * 100) : 0, mealsPlanned: plannedMeals, mealsCompleted: eatenMeals, mealAdherencePercent: plannedMeals ? Math.round(eatenMeals / plannedMeals * 100) : 0 }, performance: performances.map((performance) => ({ date: performance.recordedAt, exercise: performance.exercise.name, sets: performance.sets, reps: performance.reps, weightKg: performance.weightKg ? Number(performance.weightKg) : null })) };
  }
}

function daysAgo(days: number): Date { const date = new Date(); date.setUTCDate(date.getUTCDate() - days); return date; }
function addDays(date: Date, days: number): Date { const value = new Date(date); value.setUTCDate(value.getUTCDate() + days); return value; }
function round(value: number): number { return Math.round(value * 100) / 100; }