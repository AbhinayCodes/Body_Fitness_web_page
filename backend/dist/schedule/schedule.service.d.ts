import { PrismaService } from '../data-access/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { RecipeRepository } from '../recipe/recipe.repository';
import { WorkoutPlanService } from '../workout/workout-plan.service';
import { SchedulePlannerService } from './schedule-planner.service';
export declare class ScheduleService {
    private readonly prisma;
    private readonly nutrition;
    private readonly recipes;
    private readonly workouts;
    private readonly planner;
    constructor(prisma: PrismaService, nutrition: NutritionService, recipes: RecipeRepository, workouts: WorkoutPlanService, planner: SchedulePlannerService);
    getToday(userId: string, date?: string): Promise<import("../nutrition/nutrition-calculation.types").CalculationResult | ({
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
    replaceMeal(userId: string, scheduleId: string, slot: string, recipeId: string): Promise<{
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
    markMealEaten(userId: string, scheduleId: string, slot: string): Promise<{
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
