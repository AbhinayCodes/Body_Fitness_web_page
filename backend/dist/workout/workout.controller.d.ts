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
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        workoutPlanDayId: string | null;
        durationMinutes: number;
    }>;
    createWorkout(userId: string, payload: CreateWorkoutDto): Promise<import("../data-access/fitness-state.types").WorkoutHistoryEntry>;
}
