import { PrismaService } from '../data-access/prisma.service';
import type { CreateCheckInDto } from './dto/create-check-in.dto';
import type { CreateExercisePerformanceDto } from './dto/create-exercise-performance.dto';
import type { UpdateProgressSettingsDto } from './dto/update-progress-settings.dto';
export declare class ProgressService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createCheckIn(userId: string, payload: CreateCheckInDto): Promise<{
        measurements: {
            id: string;
            progressCheckInId: string;
            type: string;
            valueCm: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        recordedAt: Date;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        weightKg: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateSettings(userId: string, payload: UpdateProgressSettingsDto): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        checkInFrequencyDays: number;
    }>;
    logPerformance(userId: string, payload: CreateExercisePerformanceDto): Promise<{
        recordedAt: Date;
        id: string;
        userId: string;
        createdAt: Date;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        exerciseId: string;
        sets: number;
        reps: number;
    }>;
    getSummary(userId: string): Promise<{
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
                recordedAt: Date;
                id: string;
                userId: string;
                createdAt: Date;
                updatedAt: Date;
                weightKg: import("@prisma/client/runtime/library").Decimal;
            }) | null;
            previous: ({
                measurements: {
                    id: string;
                    progressCheckInId: string;
                    type: string;
                    valueCm: import("@prisma/client/runtime/library").Decimal;
                }[];
            } & {
                recordedAt: Date;
                id: string;
                userId: string;
                createdAt: Date;
                updatedAt: Date;
                weightKg: import("@prisma/client/runtime/library").Decimal;
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
}
