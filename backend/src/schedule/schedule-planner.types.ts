import type { NutritionTargets } from '../nutrition/nutrition-calculation.types';

export interface ScheduleRecipe { id: string; slug: string; name: string; mealCategory: string; dietType: string; calories: number; proteinGrams: number | { toString(): string }; carbohydrateGrams: number | { toString(): string }; fatGrams: number | { toString(): string }; fiberGrams: number | { toString(): string }; allergens: string[]; nutritionBasis: string; }
export interface DailyScheduleInput { wakeTime: string; sleepTime: string; gymTime?: string; workoutDurationMinutes: number; isTrainingDay: boolean; dietType: string; restrictions: string[]; targets: NutritionTargets; dayNumber: number; }
export interface ScheduledMeal { slot: string; scheduledMinutes: number; targetCalories: number; recipeId: string; servings: number; alternativeRecipeIds: string[]; }
export interface GeneratedDailySchedule { meals: ScheduledMeal[]; }

export interface NutrientComparison { target: number; actual: number; difference: number; percentDifference: number; }
export interface NutritionSummary { calories: NutrientComparison; proteinGrams: NutrientComparison; carbohydrateGrams: NutrientComparison; fatGrams: NutrientComparison; fiberGrams: NutrientComparison; withinTolerance: boolean; }
export interface SummaryMeal { servings: number; recipe: { calories: number; proteinGrams: number | { toString(): string }; carbohydrateGrams: number | { toString(): string }; fatGrams: number | { toString(): string }; fiberGrams: number | { toString(): string } }; }