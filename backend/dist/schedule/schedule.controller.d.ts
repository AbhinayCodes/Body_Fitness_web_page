import { ReplaceScheduledMealDto } from './dto/replace-scheduled-meal.dto';
import { ScheduleService } from './schedule.service';
export declare class ScheduleController {
    private readonly schedules;
    constructor(schedules: ScheduleService);
    getToday(userId: string): Promise<import("../nutrition/nutrition-calculation.types").CalculationResult | ({
        workoutPlanDay: ({
            exercises: ({
                exercise: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    equipment: string[];
                    slug: string;
                    muscleGroups: string[];
                    movementPattern: string;
                    locations: string[];
                    difficulty: import("@prisma/client").$Enums.ExerciseDifficulty;
                    suitableGoals: string[];
                    contraindicationNotes: string | null;
                    instructions: string[];
                    estimatedMinutes: number;
                };
            } & {
                id: string;
                workoutPlanDayId: string;
                exerciseId: string;
                sets: number;
                reps: string;
                exerciseOrder: number;
                restSeconds: number;
            })[];
        } & {
            id: string;
            estimatedMinutes: number;
            workoutPlanId: string;
            weekday: string;
            dayOrder: number;
            title: string;
            targetMuscleGroups: string[];
        }) | null;
        meals: ({
            recipe: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                dietType: import("@prisma/client").$Enums.RecipeDietType;
                slug: string;
                mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
                regionalCuisines: string[];
                preparationMinutes: number;
                servingDescription: string;
                servingGrams: number | null;
                calories: number;
                proteinGrams: import("@prisma/client/runtime/library").Decimal;
                carbohydrateGrams: import("@prisma/client/runtime/library").Decimal;
                fatGrams: import("@prisma/client/runtime/library").Decimal;
                fiberGrams: import("@prisma/client/runtime/library").Decimal;
                allergens: string[];
                tags: string[];
                preparationSteps: string[];
                nutritionBasis: string;
            };
        } & {
            id: string;
            recipeId: string;
            dailyScheduleId: string;
            slot: string;
            scheduledMinutes: number;
            targetCalories: number;
            alternativeRecipeIds: string[];
            eatenAt: Date | null;
        })[];
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        sourceFingerprint: string;
        isTrainingDay: boolean;
        workoutPlanDayId: string | null;
    })>;
    replace(userId: string, scheduleId: string, payload: ReplaceScheduledMealDto): Promise<{
        recipe: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            dietType: import("@prisma/client").$Enums.RecipeDietType;
            slug: string;
            mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
            regionalCuisines: string[];
            preparationMinutes: number;
            servingDescription: string;
            servingGrams: number | null;
            calories: number;
            proteinGrams: import("@prisma/client/runtime/library").Decimal;
            carbohydrateGrams: import("@prisma/client/runtime/library").Decimal;
            fatGrams: import("@prisma/client/runtime/library").Decimal;
            fiberGrams: import("@prisma/client/runtime/library").Decimal;
            allergens: string[];
            tags: string[];
            preparationSteps: string[];
            nutritionBasis: string;
        };
    } & {
        id: string;
        recipeId: string;
        dailyScheduleId: string;
        slot: string;
        scheduledMinutes: number;
        targetCalories: number;
        alternativeRecipeIds: string[];
        eatenAt: Date | null;
    }>;
    markEaten(userId: string, scheduleId: string, slot: string): Promise<{
        recipe: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            dietType: import("@prisma/client").$Enums.RecipeDietType;
            slug: string;
            mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
            regionalCuisines: string[];
            preparationMinutes: number;
            servingDescription: string;
            servingGrams: number | null;
            calories: number;
            proteinGrams: import("@prisma/client/runtime/library").Decimal;
            carbohydrateGrams: import("@prisma/client/runtime/library").Decimal;
            fatGrams: import("@prisma/client/runtime/library").Decimal;
            fiberGrams: import("@prisma/client/runtime/library").Decimal;
            allergens: string[];
            tags: string[];
            preparationSteps: string[];
            nutritionBasis: string;
        };
    } & {
        id: string;
        recipeId: string;
        dailyScheduleId: string;
        slot: string;
        scheduledMinutes: number;
        targetCalories: number;
        alternativeRecipeIds: string[];
        eatenAt: Date | null;
    }>;
}
