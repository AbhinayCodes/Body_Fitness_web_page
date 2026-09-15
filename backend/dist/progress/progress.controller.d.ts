import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CreateExercisePerformanceDto } from './dto/create-exercise-performance.dto';
import { UpdateProgressSettingsDto } from './dto/update-progress-settings.dto';
import { ProgressService } from './progress.service';
export declare class ProgressController {
    private readonly progress;
    constructor(progress: ProgressService);
    get(userId: string): Promise<{
        checkIn: {
            frequencyDays: number;
            due: boolean;
            dueDate: Date;
            latest: ({
                measurements: {
                    id: string;
                    progressCheckInId: string;
                    type: string;
                    valueCm: import("@prisma/client/runtime/library").Decimal;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                weightKg: import("@prisma/client/runtime/library").Decimal;
                recordedAt: Date;
            }) | null;
            previous: ({
                measurements: {
                    id: string;
                    progressCheckInId: string;
                    type: string;
                    valueCm: import("@prisma/client/runtime/library").Decimal;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                weightKg: import("@prisma/client/runtime/library").Decimal;
                recordedAt: Date;
            }) | null;
            weightChangeKg: number | null;
            note: string;
        };
        weightTrend: {
            date: Date;
            weightKg: number;
        }[];
        consistency: {
            plannedWorkouts: number;
            completedWorkouts: number;
            workoutCompletionPercent: number;
            mealsPlanned: number;
            mealsCompleted: number;
            mealAdherencePercent: number;
        };
        performance: {
            date: Date;
            exercise: string;
            sets: number;
            reps: number;
            weightKg: number | null;
        }[];
    }>;
    checkIn(userId: string, payload: CreateCheckInDto): Promise<{
        measurements: {
            id: string;
            progressCheckInId: string;
            type: string;
            valueCm: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        weightKg: import("@prisma/client/runtime/library").Decimal;
        recordedAt: Date;
    }>;
    settings(userId: string, payload: UpdateProgressSettingsDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        checkInFrequencyDays: number;
    }>;
    performance(userId: string, payload: CreateExercisePerformanceDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        sets: number;
        reps: number;
        exerciseId: string;
        recordedAt: Date;
    }>;
}
