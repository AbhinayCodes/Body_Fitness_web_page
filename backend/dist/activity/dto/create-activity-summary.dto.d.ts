export declare enum ActivitySource {
    HEALTHKIT = "HEALTHKIT",
    HEALTH_CONNECT = "HEALTH_CONNECT",
    WEARABLE = "WEARABLE",
    MANUAL = "MANUAL"
}
export declare class CreateActivitySummaryDto {
    source: ActivitySource;
    recordedAt: string;
    steps?: number;
    distanceMeters?: number;
    activeCalories?: number;
    workoutDurationMinutes?: number;
    heartRateBpm?: number;
    sleepMinutes?: number;
    recoveryScore?: number;
}
