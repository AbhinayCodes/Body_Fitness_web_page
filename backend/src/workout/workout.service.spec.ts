import { describe, expect, it, jest } from '@jest/globals';
import type { FitnessRepository } from '../data-access/fitness.repository';
import type { PrismaService } from '../data-access/prisma.service';
import { WorkoutService } from './workout.service';

function setup() {
  const prisma = {
    workoutPlanDay: { findFirst: jest.fn(async () => ({ id: 'day', estimatedMinutes: 30, exercises: [{ exerciseOrder: 0, sets: 2 }] })) },
    workoutSession: {
      findFirst: jest.fn(async () => ({ id: 'session' })),
      update: jest.fn(async () => ({ id: 'session' })),
      create: jest.fn(async () => ({ id: 'session' })),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'session' })),
    },
    exerciseCompletion: { upsert: jest.fn(async () => ({})) },
  };
  return { prisma, service: new WorkoutService({} as FitnessRepository, prisma as unknown as PrismaService) };
}

describe('WorkoutService progress validation', () => {
  it('rejects above-target sets before reading or writing a workout session', async () => {
    const { service, prisma } = setup();
    await expect(service.updateTodayProgress('user', { workoutPlanDayId: 'day', exercises: [{ exerciseIndex: 0, setsCompleted: 10 }] })).rejects.toThrow('Completed sets cannot exceed the planned sets');
    expect(prisma.workoutSession.findFirst).not.toHaveBeenCalled();
    expect(prisma.exerciseCompletion.upsert).not.toHaveBeenCalled();
  });

  it('continues to reject unknown exercise indexes', async () => {
    const { service, prisma } = setup();
    await expect(service.updateTodayProgress('user', { workoutPlanDayId: 'day', exercises: [{ exerciseIndex: 1, setsCompleted: 1 }] })).rejects.toThrow('invalid exercise');
    expect(prisma.workoutSession.findFirst).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2])('accepts %i completed sets within the planned target', async (setsCompleted) => {
    const { service, prisma } = setup();
    await expect(service.updateTodayProgress('user', { workoutPlanDayId: 'day', exercises: [{ exerciseIndex: 0, setsCompleted }] })).resolves.toEqual({ id: 'session' });
    expect(prisma.exerciseCompletion.upsert).toHaveBeenCalledWith({
      where: { workoutSessionId_exerciseIndex: { workoutSessionId: 'session', exerciseIndex: 0 } },
      update: { setsCompleted },
      create: { workoutSessionId: 'session', exerciseIndex: 0, setsCompleted },
    });
  });
});