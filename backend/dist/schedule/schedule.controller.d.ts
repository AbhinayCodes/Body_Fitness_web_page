import { ReplaceScheduledMealDto } from './dto/replace-scheduled-meal.dto';
import { ScheduleService } from './schedule.service';
export declare class ScheduleController {
    private readonly schedules;
    constructor(schedules: ScheduleService);
    getToday(userId: string): Promise<import("../nutrition/nutrition-calculation.types").CalculationResult | ({
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
            slot: string;
            scheduledMinutes: number;
            targetCalories: number;
            alternativeRecipeIds: string[];
            eatenAt: Date | null;
            recipeId: string;
            dailyScheduleId: string;
        })[];
        workoutPlanDay: ({
            exercises: ({
                exercise: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    equipment: string[];
                    estimatedMinutes: number;
                    slug: string;
                    muscleGroups: string[];
                    movementPattern: string;
                    locations: string[];
                    difficulty: import("@prisma/client").$Enums.ExerciseDifficulty;
                    suitableGoals: string[];
                    contraindicationNotes: string | null;
                    instructions: string[];
                };
            } & {
                id: string;
                workoutPlanDayId: string;
                exerciseOrder: number;
                sets: number;
                reps: string;
                restSeconds: number;
                exerciseId: string;
            })[];
        } & {
            id: string;
            weekday: string;
            dayOrder: number;
            title: string;
            targetMuscleGroups: string[];
            estimatedMinutes: number;
            workoutPlanId: string;
        }) | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
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
        slot: string;
        scheduledMinutes: number;
        targetCalories: number;
        alternativeRecipeIds: string[];
        eatenAt: Date | null;
        recipeId: string;
        dailyScheduleId: string;
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
        slot: string;
        scheduledMinutes: number;
        targetCalories: number;
        alternativeRecipeIds: string[];
        eatenAt: Date | null;
        recipeId: string;
        dailyScheduleId: string;
    }>;
}
