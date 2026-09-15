import { ActivityService } from './activity.service';
import { CreateActivitySummaryDto } from './dto/create-activity-summary.dto';
import { ListActivityHistoryDto } from './dto/list-activity-history.dto';
import { UpdateActivitySettingsDto } from './dto/update-activity-settings.dto';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    list(userId: string): Promise<{
        id: string;
        userId: string;
        source: string;
        recordedAt: Date;
        steps: number | null;
        distanceMeters: number | null;
        activeCalories: number | null;
        workoutDurationMinutes: number | null;
        heartRateBpm: number | null;
        sleepMinutes: number | null;
        recoveryScore: number | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    today(userId: string): Promise<{
        stepGoal: number;
        progress: number | null;
        primary: {
            id: string;
            userId: string;
            source: string;
            recordedAt: Date;
            steps: number | null;
            distanceMeters: number | null;
            activeCalories: number | null;
            workoutDurationMinutes: number | null;
            heartRateBpm: number | null;
            sleepMinutes: number | null;
            recoveryScore: number | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        sources: {
            id: string;
            userId: string;
            source: string;
            recordedAt: Date;
            steps: number | null;
            distanceMeters: number | null;
            activeCalories: number | null;
            workoutDurationMinutes: number | null;
            heartRateBpm: number | null;
            sleepMinutes: number | null;
            recoveryScore: number | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        note: string;
    }>;
    history(userId: string, query: ListActivityHistoryDto): Promise<{
        date: string;
        primary: {
            id: string;
            userId: string;
            source: string;
            recordedAt: Date;
            steps: number | null;
            distanceMeters: number | null;
            activeCalories: number | null;
            workoutDurationMinutes: number | null;
            heartRateBpm: number | null;
            sleepMinutes: number | null;
            recoveryScore: number | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        sources: {
            id: string;
            userId: string;
            source: string;
            recordedAt: Date;
            steps: number | null;
            distanceMeters: number | null;
            activeCalories: number | null;
            workoutDurationMinutes: number | null;
            heartRateBpm: number | null;
            sleepMinutes: number | null;
            recoveryScore: number | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }[]>;
    create(userId: string, payload: CreateActivitySummaryDto): Promise<{
        id: string;
        userId: string;
        source: string;
        recordedAt: Date;
        steps: number | null;
        distanceMeters: number | null;
        activeCalories: number | null;
        workoutDurationMinutes: number | null;
        heartRateBpm: number | null;
        sleepMinutes: number | null;
        recoveryScore: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    settings(userId: string, payload: UpdateActivitySettingsDto): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        stepGoal: number;
    }>;
}
