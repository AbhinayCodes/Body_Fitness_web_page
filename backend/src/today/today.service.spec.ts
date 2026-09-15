import { describe, expect, it, jest } from '@jest/globals';
import { TodayService } from './today.service';

const targets = { calories: 2000, proteinGrams: 100, carbohydrateGrams: 250, fatGrams: 60, fiberGrams: 28 };
const meal = { id: 'meal-id', slot: 'LUNCH', scheduledMinutes: 780, eatenAt: new Date(), recipe: { name: 'Rajma Chawal' } };

describe('TodayService', () => {
  it('builds a workout-day read model with partial and completed set adherence', async () => {
    const schedule = { id: 'schedule-id', date: new Date('2026-09-15'), isTrainingDay: true, meals: [meal, { ...meal, id: 'meal-two', eatenAt: null }], workoutPlanDay: { id: 'plan-day', title: 'Upper strength', estimatedMinutes: 45, exercises: [{ exerciseOrder: 0, sets: 3 }] } };
    const prisma = { profile: { findUnique: jest.fn().mockResolvedValue({ name: 'Member' }) }, activitySummary: { findFirst: jest.fn().mockResolvedValue({ steps: 8000, source: 'MANUAL' }) }, workoutSession: { findFirst: jest.fn().mockResolvedValue({ exercises: [{ exerciseIndex: 0, setsCompleted: 2 }] }) } };
    const service = new TodayService(prisma as never, { getToday: jest.fn().mockResolvedValue(schedule) } as never, { getTargets: jest.fn().mockResolvedValue({ status: 'READY', targets, metadata: { message: 'Estimate' } }) } as never);
    const result = await service.get('user-id');
    expect(result).toMatchObject({ status: 'READY', adherence: { mealsCompleted: 1, mealsPlanned: 2, workoutCompletedSets: 2, workoutTargetSets: 3, consistencyPercent: 58 }, activity: { steps: 8000 } });
    expect(result.schedule.workout.completed).toBe(false);
  });

  it('returns a clear rest-day state without trying to load workout progress', async () => {
    const schedule = { id: 'schedule-id', date: new Date('2026-09-15'), isTrainingDay: false, meals: [], workoutPlanDay: null };
    const prisma = { profile: { findUnique: jest.fn().mockResolvedValue({ name: 'Member' }) }, activitySummary: { findFirst: jest.fn().mockResolvedValue(null) }, workoutSession: { findFirst: jest.fn() } };
    const service = new TodayService(prisma as never, { getToday: jest.fn().mockResolvedValue(schedule) } as never, { getTargets: jest.fn().mockResolvedValue({ status: 'READY', targets, metadata: { message: 'Estimate' } }) } as never);
    const result = await service.get('user-id');
    expect(result).toMatchObject({ status: 'READY', schedule: { isTrainingDay: false, workout: null }, adherence: { consistencyPercent: 100 } });
    expect(prisma.workoutSession.findFirst).not.toHaveBeenCalled();
  });
});