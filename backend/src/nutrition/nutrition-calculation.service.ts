import { Injectable } from '@nestjs/common';
import type { CalculationResult, DailyActivity, NutritionCalculationInput, NutritionTargets } from './nutrition-calculation.types';

const activityMultipliers: Record<DailyActivity, number> = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
};

// Carbs are derived as the energy remainder, so rounding can shift macro-sum calories by a few kcal.
// Anything beyond this documented tolerance indicates an inconsistent (unsafe) target.
const MACRO_TOLERANCE_CALORIES = 10;

@Injectable()
export class NutritionCalculationService {
  calculate(input: NutritionCalculationInput): CalculationResult {
    this.validate(input);
    if (input.requiresMedicalNutritionSupport) {
      return { status: 'MEDICAL_REFERRAL', metadata: { estimated: true, reasons: input.medicalNutritionReasons, message: 'This app cannot provide medical nutrition management. Please work with a qualified healthcare professional or registered dietitian.' } };
    }
    if (input.age < 18) {
      return { status: 'UNDER_18', metadata: { estimated: true, message: 'This app does not set calorie or body-composition targets for people under 18. Please discuss nutrition needs with a parent, guardian, and qualified healthcare professional.' } };
    }

    const basalEnergyRequirement = this.basalEnergyRequirement(input);
    const { multiplier, source } = this.activityMultiplier(input);
    const estimatedDailyEnergyExpenditure = basalEnergyRequirement * multiplier;
    const goalAdjustmentCalories = input.primaryGoal === 'Build muscle' ? 200 : input.primaryGoal === 'Lose fat' ? -300 : 0;
    // Safety floor: never recommend eating below basal metabolic rate, even for aggressive goals.
    const adjustedCalories = estimatedDailyEnergyExpenditure + goalAdjustmentCalories;
    const caloriesFlooredToBasal = adjustedCalories < basalEnergyRequirement;
    const calories = roundToTen(Math.max(adjustedCalories, basalEnergyRequirement));

    const proteinPerKg = input.primaryGoal === 'Build muscle' ? (input.trainingDays.length >= 3 ? 1.6 : 1.4) : input.primaryGoal === 'Lose fat' ? 1.5 : 1.2;
    const proteinGrams = Math.round(input.weightKg * proteinPerKg);
    const fatGrams = Math.round(Math.max(input.weightKg * 0.8, (calories * 0.2) / 9));
    const proteinFatCalories = proteinGrams * 4 + fatGrams * 9;
    const carbohydrateGrams = Math.round((calories - proteinFatCalories) / 4);
    const fiberGrams = Math.round((calories / 1000) * 14);

    // Consistency guard: do not clamp carbs independently to hide an impossible macro combination.
    // If the required protein and fat already exceed the energy budget, there is no valid plan.
    const macroCalories = proteinGrams * 4 + carbohydrateGrams * 4 + fatGrams * 9;
    const unsafe = calories <= 0 || proteinGrams < 0 || fatGrams < 0 || carbohydrateGrams < 0 || fiberGrams < 0 || proteinFatCalories > calories || Math.abs(macroCalories - calories) > MACRO_TOLERANCE_CALORIES;
    if (unsafe) {
      return { status: 'NEEDS_REVIEW', metadata: { estimated: true, basalEnergyRequirement: Math.round(basalEnergyRequirement), reasons: ['The combination of body measurements and goal produces an implausible or internally inconsistent target.'], message: 'We could not calculate a safe, consistent nutrition target from these inputs. Please double-check your height, weight, and age, or consult a qualified professional for a tailored plan.' } };
    }

    const targets: NutritionTargets = { calories, proteinGrams, fatGrams, carbohydrateGrams, fiberGrams };

    return { status: 'READY', targets, metadata: { estimated: true, basalEnergyRequirement: Math.round(basalEnergyRequirement), activityMultiplier: multiplier, estimatedDailyEnergyExpenditure: Math.round(estimatedDailyEnergyExpenditure), goalAdjustmentCalories, activitySource: source, caloriesFlooredToBasal, message: 'These are estimated starting targets, not exact energy expenditure or medical nutrition advice. Reassess with real-world progress, hunger, recovery, and professional guidance where appropriate.' } };
  }

  private basalEnergyRequirement(input: NutritionCalculationInput): number {
    const sexConstant = input.sex === 'MALE' ? 5 : input.sex === 'FEMALE' ? -161 : -78;
    return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexConstant;
  }

  private activityMultiplier(input: NutritionCalculationInput): { multiplier: number; source: 'SELF_REPORTED' | 'TRAINING_DERIVED' } {
    if (input.dailyActivity) return { multiplier: activityMultipliers[input.dailyActivity], source: 'SELF_REPORTED' };
    const weeklyTrainingMinutes = input.trainingDays.length * input.workoutDurationMinutes;
    if (weeklyTrainingMinutes < 90) return { multiplier: 1.2, source: 'TRAINING_DERIVED' };
    if (weeklyTrainingMinutes < 180) return { multiplier: 1.375, source: 'TRAINING_DERIVED' };
    if (weeklyTrainingMinutes < 300) return { multiplier: 1.55, source: 'TRAINING_DERIVED' };
    return { multiplier: 1.725, source: 'TRAINING_DERIVED' };
  }

  private validate(input: NutritionCalculationInput): void {
    if (!Number.isInteger(input.age) || input.age < 13 || input.age > 100) throw new NutritionInputError('Age must be between 13 and 100.');
    if (!Number.isFinite(input.heightCm) || input.heightCm < 100 || input.heightCm > 250) throw new NutritionInputError('Height must be between 100 and 250 cm.');
    if (!Number.isFinite(input.weightKg) || input.weightKg < 25 || input.weightKg > 350) throw new NutritionInputError('Weight must be between 25 and 350 kg.');
    if (!input.trainingDays.length) throw new NutritionInputError('At least one training day is required.');
    if (![30, 45, 60, 90].includes(input.workoutDurationMinutes)) throw new NutritionInputError('Workout duration must be 30, 45, 60, or 90 minutes.');
  }
}

export class NutritionInputError extends Error {}

function roundToTen(value: number): number { return Math.round(value / 10) * 10; }