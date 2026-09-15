import { ActivityService } from './activity.service';
import { CreateActivitySummaryDto } from './dto/create-activity-summary.dto';
import { ListActivityHistoryDto } from './dto/list-activity-history.dto';
import { UpdateActivitySettingsDto } from './dto/update-activity-settings.dto';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    list(userId: string): Promise<{
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
    }[]>;
    today(userId: string): Promise<{
        stepGoal: number;
        progress: number | null;
        primary: {
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
        sources: {
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
        }[];
        note: string;
    }>;
    history(userId: string, query: ListActivityHistoryDto): Promise<{
        date: string;
        primary: {
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
        sources: {
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
        }[];
    }[]>;
    create(userId: string, payload: CreateActivitySummaryDto): Promise<{
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
    }>;
    settings(userId: string, payload: UpdateActivitySettingsDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        stepGoal: number;
    }>;
}
