import type { DailyScheduleInput, GeneratedDailySchedule, ScheduleRecipe } from './schedule-planner.types';
export declare class SchedulePlannerService {
    generate(input: DailyScheduleInput, recipes: ScheduleRecipe[]): GeneratedDailySchedule;
    private recipeFor;
}
export declare class SchedulePlanningError extends Error {
}
export declare function parseTime(value: string): number;
