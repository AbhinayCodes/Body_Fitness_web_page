import { TodayService } from './today.service';
export declare class TodayController {
    private readonly today;
    constructor(today: TodayService);
    get(userId: string): Promise<{
        status: "READY" | "UNDER_18" | "MEDICAL_REFERRAL";
        message: string;
        date?: undefined;
        profile?: undefined;
        nutrition?: undefined;
        schedule?: undefined;
        adherence?: undefined;
        activity?: undefined;
    } | {
        status: string;
        date: Date;
        profile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            goal: string;
            days: string;
            diet: string;
            userId: string;
        } | null;
        nutrition: import("../nutrition/nutrition-calculation.types").CalculationResult;
        schedule: {
            id: string;
            isTrainingDay: boolean;
            meals: {
                alternatives: {
                    id: string;
                    name: string;
                    calories: number;
                    proteinGrams: import("@prisma/client/runtime/library").Decimal;
                }[];
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
                id: string;
                slot: string;
                scheduledMinutes: number;
                targetCalories: number;
                alternativeRecipeIds: string[];
                eatenAt: Date | null;
                recipeId: string;
                dailyScheduleId: string;
            }[];
            workout: {
                completedSets: number;
                targetSets: number;
                completedExerciseSets: {
                    exerciseIndex: number;
                    setsCompleted: number;
                }[];
                completed: boolean;
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
                id: string;
                weekday: string;
                dayOrder: number;
                title: string;
                targetMuscleGroups: string[];
                estimatedMinutes: number;
                workoutPlanId: string;
            } | null;
        };
        adherence: {
            mealsCompleted: number;
            mealsPlanned: number;
            workoutCompletedSets: number;
            workoutTargetSets: number;
            consistencyPercent: number;
        };
        activity: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            workoutDurationMinutes: number | null;
            source: string;
            recordedAt: Date;
            steps: number | null;
            distanceMeters: number | null;
            activeCalories: number | null;
            heartRateBpm: number | null;
            sleepMinutes: number | null;
            recoveryScore: number | null;
        } | null;
        message?: undefined;
    }>;
}
