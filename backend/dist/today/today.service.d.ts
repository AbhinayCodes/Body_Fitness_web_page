import { PrismaService } from '../data-access/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { ScheduleService } from '../schedule/schedule.service';
export declare class TodayService {
    private readonly prisma;
    private readonly schedules;
    private readonly nutrition;
    constructor(prisma: PrismaService, schedules: ScheduleService, nutrition: NutritionService);
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
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            goal: string;
            days: string;
            diet: string;
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
                recipeId: string;
                dailyScheduleId: string;
                slot: string;
                scheduledMinutes: number;
                targetCalories: number;
                alternativeRecipeIds: string[];
                eatenAt: Date | null;
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
                id: string;
                estimatedMinutes: number;
                workoutPlanId: string;
                weekday: string;
                dayOrder: number;
                title: string;
                targetMuscleGroups: string[];
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
            source: string;
            recordedAt: Date;
            steps: number | null;
            distanceMeters: number | null;
            activeCalories: number | null;
            workoutDurationMinutes: number | null;
            heartRateBpm: number | null;
            sleepMinutes: number | null;
            recoveryScore: number | null;
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        message?: undefined;
    }>;
}
