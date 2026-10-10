import { describe, expect, it, jest } from '@jest/globals';
import { NutritionService } from './nutrition.service';
import { NutritionCalculationService } from './nutrition-calculation.service';

const calculator = new NutritionCalculationService();

function onboardingFor(overrides: Record<string, unknown> = {}) {
  return {
    completed: true,
    age: 30,
    sex: 'MALE',
    heightCm: 180,
    weightKg: 75,
    primaryGoal: 'Build muscle',
    trainingExperience: 'INTERMEDIATE',
    trainingDays: ['Monday', 'Wednesday', 'Friday'],
    workoutDurationMinutes: 60,
    trainingLocation: 'GYM',
    secondaryGoals: [],
    dailyActivity: 'MODERATELY_ACTIVE',
    workSchedule: null,
    preferredGymTime: null,
    responses: {},
    ...overrides,
  };
}

function serviceWith(onboarding: unknown) {
  const prisma = { onboarding: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(onboarding) } };
  return new NutritionService(prisma as never, calculator);
}

describe('NutritionService — medical nutrition wiring through the real path', () => {
  it('returns a normal READY target when no medical flags are present', async () => {
    const result = await serviceWith(onboardingFor()).getTargets('user-1');
    expect(result.status).toBe('READY');
    expect(result.targets).toBeDefined();
  });

  it('routes doctor-imposed diet restriction to a medical referral', async () => {
    const result = await serviceWith(onboardingFor({ responses: { doctorDietRestrictions: 'yes' } })).getTargets('user-1');
    expect(result.status).toBe('MEDICAL_REFERRAL');
    expect(result.targets).toBeUndefined();
    expect(result.metadata.reasons?.some((reason) => /doctor/i.test(reason))).toBe(true);
  });

  it('routes a nutrition-sensitive condition (diabetes) to a medical referral', async () => {
    const result = await serviceWith(onboardingFor({ responses: { healthConditions: ['diabetes'] } })).getTargets('user-1');
    expect(result.status).toBe('MEDICAL_REFERRAL');
  });

  it('does not refer for a non-nutrition condition (asthma)', async () => {
    const result = await serviceWith(onboardingFor({ responses: { healthConditions: ['asthma'] } })).getTargets('user-1');
    expect(result.status).toBe('READY');
  });

  it('keeps under-18 safety handling ahead of a normal plan', async () => {
    const result = await serviceWith(onboardingFor({ age: 16 })).getTargets('user-1');
    expect(result.status).toBe('UNDER_18');
  });

  it('rejects an incomplete onboarding profile instead of inventing targets', async () => {
    await expect(serviceWith(onboardingFor({ weightKg: null })).getTargets('user-1')).rejects.toThrow('incomplete');
  });
});
