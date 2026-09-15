import type { CalculationResult, NutritionCalculationInput } from './nutrition-calculation.types';
export declare class NutritionCalculationService {
    calculate(input: NutritionCalculationInput): CalculationResult;
    private basalEnergyRequirement;
    private activityMultiplier;
    private validate;
}
export declare class NutritionInputError extends Error {
}
