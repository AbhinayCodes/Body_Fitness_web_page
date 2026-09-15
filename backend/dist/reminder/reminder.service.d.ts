import { PrismaService } from '../data-access/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { ScheduleService } from '../schedule/schedule.service';
import type { UpdateReminderSettingsDto } from './dto/update-reminder-settings.dto';
export declare class ReminderService {
    private readonly prisma;
    private readonly schedules;
    private readonly progress;
    constructor(prisma: PrismaService, schedules: ScheduleService, progress: ProgressService);
    getSettings(userId: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        timezone: string;
        workoutEnabled: boolean;
        mealEnabled: boolean;
        preWorkoutEnabled: boolean;
        postWorkoutEnabled: boolean;
        checkInEnabled: boolean;
        workoutLeadMinutes: number;
        mealLeadMinutes: number;
        checkInTime: string;
    }>;
    updateSettings(userId: string, payload: UpdateReminderSettingsDto): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        timezone: string;
        workoutEnabled: boolean;
        mealEnabled: boolean;
        preWorkoutEnabled: boolean;
        postWorkoutEnabled: boolean;
        checkInEnabled: boolean;
        workoutLeadMinutes: number;
        mealLeadMinutes: number;
        checkInTime: string;
    }>;
    getToday(userId: string): Promise<{
        settings: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            timezone: string;
            workoutEnabled: boolean;
            mealEnabled: boolean;
            preWorkoutEnabled: boolean;
            postWorkoutEnabled: boolean;
            checkInEnabled: boolean;
            workoutLeadMinutes: number;
            mealLeadMinutes: number;
            checkInTime: string;
        };
        occurrences: {
            id: string;
            userId: string;
            createdAt: Date;
            scheduledMinutes: number;
            timezone: string;
            kind: string;
            sourceKey: string;
            scheduledLocalDate: string;
            payload: string;
            acknowledgedAt: Date | null;
        }[];
        message: string;
    }>;
    private candidates;
}
