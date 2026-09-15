import { CreateWorkoutDto } from './dto/create-workout.dto';
import { WorkoutService } from './workout.service';
import { WorkoutPlanService } from './workout-plan.service';
import { UpdateWorkoutProgressDto } from './dto/update-workout-progress.dto';
export declare class WorkoutController {
    private readonly workoutService;
    private readonly workoutPlanService;
    constructor(workoutService: WorkoutService, workoutPlanService: WorkoutPlanService);
    getPlan(userId: string): Promise<{
        days: ({
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        goal: string;
        userId: string;
        trainingDays: string[];
        trainingLocation: string;
        sourceFingerprint: string;
        experience: string;
        durationMinutes: number;
    }>;
    updateTodayProgress(userId: string, payload: UpdateWorkoutProgressDto): Promise<{
        exercises: {
            id: string;
            createdAt: Date;
            workoutSessionId: string;
            exerciseIndex: number;
            setsCompleted: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        date: Date;
        workoutPlanDayId: string | null;
        durationMinutes: number;
    }>;
    createWorkout(userId: string, payload: CreateWorkoutDto): Promise<import("../data-access/fitness-state.types").WorkoutHistoryEntry>;
}
