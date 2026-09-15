import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export enum ActivitySource { HEALTHKIT = 'HEALTHKIT', HEALTH_CONNECT = 'HEALTH_CONNECT', WEARABLE = 'WEARABLE', MANUAL = 'MANUAL' }

export class CreateActivitySummaryDto {
  @IsEnum(ActivitySource) source!: ActivitySource;
  @IsDateString() recordedAt!: string;
  @IsOptional() @IsInt() @Min(0) steps?: number;
  @IsOptional() @IsInt() @Min(0) distanceMeters?: number;
  @IsOptional() @IsInt() @Min(0) activeCalories?: number;
  @IsOptional() @IsInt() @Min(0) workoutDurationMinutes?: number;
  @IsOptional() @IsInt() @Min(20) @Max(260) heartRateBpm?: number;
  @IsOptional() @IsInt() @Min(0) sleepMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) recoveryScore?: number;
}
