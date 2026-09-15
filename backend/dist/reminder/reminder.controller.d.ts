import { UpdateReminderSettingsDto } from './dto/update-reminder-settings.dto';
import { ReminderService } from './reminder.service';
export declare class ReminderController {
    private readonly reminders;
    constructor(reminders: ReminderService);
    settings(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
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
    update(userId: string, payload: UpdateReminderSettingsDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
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
    today(userId: string): Promise<{
        settings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
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
            createdAt: Date;
            userId: string;
            timezone: string;
            scheduledMinutes: number;
            kind: string;
            sourceKey: string;
            scheduledLocalDate: string;
            payload: string;
            acknowledgedAt: Date | null;
        }[];
        message: string;
    }>;
}
