import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { ScheduleService } from './schedule.service';
import { SchedulePlannerService } from './schedule-planner.service';

describe('ScheduleService replacement', () => {
  it('only replaces a user-owned scheduled meal with one of its listed alternatives', async () => {
    const prisma = { dailyScheduleMeal: { findFirst: jest.fn().mockResolvedValue({ id: 'meal-id', recipeId: 'current', alternativeRecipeIds: ['alternative'], dailyScheduleId: 'schedule-id' }), update: jest.fn().mockResolvedValue({}) } };
    const service = new ScheduleService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    await service.replaceMeal('user-id', 'schedule-id', 'DINNER', 'alternative');
    expect(prisma.dailyScheduleMeal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'meal-id' }, data: { recipeId: 'alternative', alternativeRecipeIds: ['current'] } }));
    await expect(service.replaceMeal('user-id', 'schedule-id', 'DINNER', 'not-listed')).rejects.toBeInstanceOf(BadRequestException);
  });
});

const veganCatalog = ['BREAKFAST', 'LUNCH', 'DINNER'].map((mealCategory, index) => ({
  id: `r${index}`, slug: `r${index}`, name: `r${index}`, mealCategory, dietType: 'VEGAN', calories: 400,
  proteinGrams: 20, carbohydrateGrams: 50, fatGrams: 10, fiberGrams: 8, allergens: [] as string[], ingredients: [] as Array<{ ingredient: { name: string } }>, nutritionBasis: 'Estimate',
}));

function cacheHarness(onboarding: Record<string, unknown>) {
  const captured: string[] = [];
  const prisma = {
    onboarding: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(onboarding) },
    dailySchedule: {
      findUnique: jest.fn<(args: { where: { userId_date_sourceFingerprint: { sourceFingerprint: string } } }) => Promise<unknown>>().mockImplementation(async (args) => { captured.push(args.where.userId_date_sourceFingerprint.sourceFingerprint); return null; }),
      create: jest.fn<(args: { data: unknown }) => Promise<unknown>>().mockImplementation(async (args) => ({ id: 'sched', ...(args.data as Record<string, unknown>) })),
    },
  };
  const nutrition = { getTargets: jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'READY', targets: { calories: 2000, proteinGrams: 100, carbohydrateGrams: 250, fatGrams: 60, fiberGrams: 28 }, metadata: { estimated: true, message: '' } }) };
  const workouts = { getPlan: jest.fn<() => Promise<unknown>>().mockResolvedValue({ requiresMedicalClearance: true }) };
  const recipes = { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue(veganCatalog) };
  const service = new ScheduleService(prisma as never, nutrition as never, recipes as never, workouts as never, new SchedulePlannerService());
  return { service, prisma, captured };
}

function onboardingRecord(overrides: Record<string, unknown> = {}) {
  return { completed: true, wakeTime: '06:00', sleepTime: '22:00', dietType: 'Vegan', workoutDurationMinutes: 45, preferredGymTime: null, foodRestrictions: [] as string[], updatedAt: new Date('2026-01-01T00:00:00.000Z'), ...overrides };
}

describe('ScheduleService caching', () => {
  it('returns the cached schedule without regenerating when nothing changed', async () => {
    const onboarding = onboardingRecord();
    const { service, prisma } = cacheHarness(onboarding);
    prisma.dailySchedule.findUnique.mockResolvedValueOnce({ id: 'cached', meals: [] });
    const result = await service.getToday('user-1', '2026-01-05') as { id: string };
    expect(result.id).toBe('cached');
    expect(prisma.dailySchedule.create).not.toHaveBeenCalled();
  });

  it('busts the cache (new fingerprint) when onboarding changes', async () => {
    const first = cacheHarness(onboardingRecord());
    await first.service.getToday('user-1', '2026-01-05');
    const second = cacheHarness(onboardingRecord({ foodRestrictions: ['dairy'], updatedAt: new Date('2026-02-01T00:00:00.000Z') }));
    await second.service.getToday('user-1', '2026-01-05');
    expect(first.captured[0]).not.toBe(second.captured[0]);
    expect(first.prisma.dailySchedule.create).toHaveBeenCalled();
  });
});