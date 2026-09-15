import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { ProgressService } from './progress.service';

function serviceWith(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    progressCheckIn: { upsert: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    progressSettings: { upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue(null) },
    exercise: { findUnique: jest.fn().mockResolvedValue({ id: 'exercise-id' }) },
    exercisePerformance: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    dailySchedule: { findMany: jest.fn().mockResolvedValue([]) },
    workoutSession: { findMany: jest.fn().mockResolvedValue([]) },
    ...prismaOverrides,
  };
  return { service: new ProgressService(prisma as never), prisma };
}

describe('ProgressService', () => {
  it('creates a first check-in with optional measurements and updates a subsequent same-date check-in', async () => {
    const { service, prisma } = serviceWith();
    const payload = { recordedAt: '2026-09-15', weightKg: 72.4, measurements: [{ type: 'WAIST', valueCm: 82 }] };
    await service.createCheckIn('user-id', payload);
    expect(prisma.progressCheckIn.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ userId: 'user-id', measurements: { create: payload.measurements } }), update: expect.objectContaining({ measurements: { deleteMany: {}, create: payload.measurements } }) }));
  });

  it('supports a measurement-free check-in and rejects duplicate measurement types', async () => {
    const { service } = serviceWith();
    await expect(service.createCheckIn('user-id', { recordedAt: '2026-09-15', weightKg: 72.4 })).resolves.toBeDefined();
    await expect(service.createCheckIn('user-id', { recordedAt: '2026-09-15', weightKg: 72.4, measurements: [{ type: 'WAIST', valueCm: 80 }, { type: 'WAIST', valueCm: 81 }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists weekly and biweekly check-in frequency', async () => {
    const { service, prisma } = serviceWith();
    await service.updateSettings('user-id', { checkInFrequencyDays: 7 });
    await service.updateSettings('user-id', { checkInFrequencyDays: 14 });
    expect(prisma.progressSettings.upsert).toHaveBeenLastCalledWith({ where: { userId: 'user-id' }, update: { checkInFrequencyDays: 14 }, create: { userId: 'user-id', checkInFrequencyDays: 14 } });
  });

  it('records actual exercise performance and rejects an unknown exercise', async () => {
    const { service, prisma } = serviceWith();
    await service.logPerformance('user-id', { exerciseId: 'exercise-id', recordedAt: '2026-09-15', sets: 3, reps: 10, weightKg: 30 });
    expect(prisma.exercisePerformance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'user-id', sets: 3, reps: 10, weightKg: 30 }) }));
    prisma.exercise.findUnique.mockResolvedValueOnce(null);
    await expect(service.logPerformance('user-id', { exerciseId: 'missing', recordedAt: '2026-09-15', sets: 3, reps: 10 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('summarizes real weight trend, completed workouts, meal adherence, and performance without body-composition claims', async () => {
    const checkIns = [{ recordedAt: new Date('2026-09-01'), weightKg: 72, measurements: [] }, { recordedAt: new Date('2026-09-15'), weightKg: 72.4, measurements: [] }];
    const schedules = [{ meals: [{ eatenAt: new Date() }, { eatenAt: null }], workoutPlanDay: { id: 'day' } }];
    const sessions = [{ exercises: [{ setsCompleted: 6 }], workoutPlanDay: { exercises: [{ sets: 6 }] } }];
    const { service } = serviceWith({ progressCheckIn: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue(checkIns) }, progressSettings: { upsert: jest.fn(), findUnique: jest.fn().mockResolvedValue({ checkInFrequencyDays: 14 }) }, dailySchedule: { findMany: jest.fn().mockResolvedValue(schedules) }, workoutSession: { findMany: jest.fn().mockResolvedValue(sessions) }, exercisePerformance: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([{ recordedAt: new Date('2026-09-15'), exercise: { name: 'Squat' }, sets: 3, reps: 10, weightKg: 30 }]) } });
    const summary = await service.getSummary('user-id');
    expect(summary).toMatchObject({ checkIn: { frequencyDays: 14, weightChangeKg: 0.4 }, weightTrend: [{ weightKg: 72 }, { weightKg: 72.4 }], consistency: { completedWorkouts: 1, workoutCompletionPercent: 100, mealsCompleted: 1, mealAdherencePercent: 50 }, performance: [{ exercise: 'Squat', weightKg: 30 }] });
    expect(summary.checkIn.note).toContain('do not establish body-composition');
  });
});