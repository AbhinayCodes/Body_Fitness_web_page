import { PrismaService } from '../data-access/prisma.service';
import { WorkoutPlannerService } from './workout-planner.service';
export declare class WorkoutPlanService {
    private readonly prisma;
    private readonly planner;
    constructor(prisma: PrismaService, planner: WorkoutPlannerService);
    getPlan(userId: string): Promise<{
        days: ({
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
        })[];
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        goal: string;
        trainingDays: string[];
        trainingLocation: string;
        sourceFingerprint: string;
        durationMinutes: number;
        experience: string;
    }>;
    private inputFromOnboarding;
}
