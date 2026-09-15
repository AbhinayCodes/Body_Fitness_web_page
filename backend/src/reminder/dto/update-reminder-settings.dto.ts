import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateReminderSettingsDto {
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsBoolean() workoutEnabled?: boolean;
  @IsOptional() @IsBoolean() mealEnabled?: boolean;
  @IsOptional() @IsBoolean() preWorkoutEnabled?: boolean;
  @IsOptional() @IsBoolean() postWorkoutEnabled?: boolean;
  @IsOptional() @IsBoolean() checkInEnabled?: boolean;
  @IsOptional() @IsInt() @Min(5) @Max(120) workoutLeadMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) mealLeadMinutes?: number;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) checkInTime?: string;
}