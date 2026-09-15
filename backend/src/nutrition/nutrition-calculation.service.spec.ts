import { describe, expect, it } from '@jest/globals';
import { NutritionCalculationService, NutritionInputError } from './nutrition-calculation.service';
import type { NutritionCalculationInput } from './nutrition-calculation.types';

const calculator = new NutritionCalculationService();
const baseInput: NutritionCalculationInput = {
  age: 30,
  sex: 'FEMALE',
  heightCm: 165,
  weightKg: 60,
  trainingDays: ['Monday', 'Wednesday', 'Friday'],
  workoutDurationMinutes: 45,
  trainingExperience: 'BEGINNER',
  trainingLocation: 'HOME',
  primaryGoal: 'Maintain fitness',
  dailyActivity: 'MODERATELY_ACTIVE',
};

describe('NutritionCalculationService', () => {
  it('calculates deterministic maintenance targets from Mifflin-St Jeor and PAL', () => {
    expect(calculator.calculate(baseInput)).toMatchObject({
      status: 'READY',
      targets: { calories: 2050, proteinGrams: 72, fatGrams: 48, carbohydrateGrams: 333, fiberGrams: 29 },
      metadata: { basalEnergyRequirement: 1320, activityMultiplier: 1.55, estimatedDailyEnergyExpenditure: 2046, goalAdjustmentCalories: 0, activitySource: 'SELF_REPORTED' },
    });
  });

  it('applies a conservative muscle-building adjustment and training-aware protein target', () => {
    const result = calculator.calculate({ ...baseInput, primaryGoal: 'Build muscle' });
    expect(result.targets).toMatchObject({ calories: 2250, proteinGrams: 96, fatGrams: 50, carbohydrateGrams: 354 });
    expect(result.metadata.goalAdjustmentCalories).toBe(200);
  });

  it('applies a conservative fat-loss adjustment instead of an aggressive deficit', () => {
    const result = calculator.calculate({ ...baseInput, primaryGoal: 'Lose fat' });
    expect(result.targets).toMatchObject({ calories: 1750, proteinGrams: 90, fatGrams: 48, carbohydrateGrams: 240 });
    expect(result.metadata.goalAdjustmentCalories).toBe(-300);
  });

  it('changes energy estimates for age, height, weight, and sex', () => {
    const baseline = calculator.calculate(baseInput).targets!.calories;
    const largerMale = calculator.calculate({ ...baseInput, sex: 'MALE', age: 22, heightCm: 185, weightKg: 85 }).targets!.calories;
    const olderSmallerUser = calculator.calculate({ ...baseInput, age: 55, heightCm: 155, weightKg: 50 }).targets!.calories;
    expect(largerMale).toBeGreaterThan(baseline);
    expect(olderSmallerUser).toBeLessThan(baseline);
  });

  it('uses self-reported activity when available and training-derived PAL otherwise', () => {
    const sedentary = calculator.calculate({ ...baseInput, dailyActivity: 'SEDENTARY' });
    const derived = calculator.calculate({ ...baseInput, dailyActivity: undefined, trainingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], workoutDurationMinutes: 60 });
    expect(sedentary.metadata.activityMultiplier).toBe(1.2);
    expect(derived.metadata).toMatchObject({ activityMultiplier: 1.725, activitySource: 'TRAINING_DERIVED' });
    expect(derived.targets!.calories).toBeGreaterThan(sedentary.targets!.calories);
  });

  it('returns a safety-only result for people under 18', () => {
    const result = calculator.calculate({ ...baseInput, age: 17, primaryGoal: 'Lose fat' });
    expect(result).toMatchObject({ status: 'UNDER_18', metadata: { estimated: true } });
    expect(result.targets).toBeUndefined();
  });

  it('returns a professional referral instead of medical nutrition management', () => {
    const result = calculator.calculate({ ...baseInput, requiresMedicalNutritionSupport: true });
    expect(result).toMatchObject({ status: 'MEDICAL_REFERRAL', metadata: { estimated: true } });
    expect(result.targets).toBeUndefined();
  });

  it('rejects invalid boundary inputs', () => {
    expect(() => calculator.calculate({ ...baseInput, age: 101 })).toThrow(NutritionInputError);
    expect(() => calculator.calculate({ ...baseInput, heightCm: 99 })).toThrow('Height must be between 100 and 250 cm.');
    expect(() => calculator.calculate({ ...baseInput, weightKg: 24 })).toThrow('Weight must be between 25 and 350 kg.');
    expect(() => calculator.calculate({ ...baseInput, trainingDays: [] })).toThrow('At least one training day is required.');
  });
});