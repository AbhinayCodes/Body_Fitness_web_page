import { PrismaService } from '../data-access/prisma.service';
import { FitnessRepository } from '../data-access/fitness.repository';
import type { WorkoutHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateWorkoutDto } from './dto/create-workout.dto';
import type { UpdateWorkoutProgressDto } from './dto/update-workout-progress.dto';
export declare class WorkoutService {
    private readonly repository;
    private readonly prisma;
    constructor(repository: FitnessRepository, prisma: PrismaService);
    createWorkout(userId: string, payload: CreateWorkoutDto): Promise<WorkoutHistoryEntry>;
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
}
