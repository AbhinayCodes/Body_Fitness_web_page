import type { NutritionTargets } from '../nutrition/nutrition-calculation.types';
export interface ScheduleRecipe {
    id: string;
    slug: string;
    name: string;
    mealCategory: string;
    dietType: string;
    calories: number;
    proteinGrams: number | {
        toString(): string;
    };
    carbohydrateGrams: number | {
        toString(): string;
    };
    fatGrams: number | {
        toString(): string;
    };
    fiberGrams: number | {
        toString(): string;
    };
    allergens: string[];
    nutritionBasis: string;
}
export interface DailyScheduleInput {
    wakeTime: string;
    sleepTime: string;
    gymTime?: string;
    workoutDurationMinutes: number;
    isTrainingDay: boolean;
    dietType: string;
    restrictions: string[];
    targets: NutritionTargets;
}
export interface ScheduledMeal {
    slot: string;
    scheduledMinutes: number;
    targetCalories: number;
    recipeId: string;
    alternativeRecipeIds: string[];
}
export interface GeneratedDailySchedule {
    meals: ScheduledMeal[];
}
