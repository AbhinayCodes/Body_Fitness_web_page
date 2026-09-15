import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SaveOnboardingDto {
  @IsOptional() @IsInt() @Min(13) @Max(120) age?: number;
  @IsOptional() @IsIn(['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']) sex?: string;
  @IsOptional() @IsInt() @Min(80) @Max(250) heightCm?: number;
  @IsOptional() @IsInt() @Min(25) @Max(400) weightKg?: number;
  @IsOptional() @IsString() primaryGoal?: string;
  @IsOptional() @IsString() secondaryGoal?: string;
  @IsOptional() @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) trainingExperience?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) trainingDays?: string[];
  @IsOptional() @IsInt() @Min(15) @Max(240) workoutDurationMinutes?: number;
  @IsOptional() @IsIn(['HOME', 'GYM', 'OUTDOOR', 'MIXED']) trainingLocation?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) equipment?: string[];
  @IsOptional() @IsString() dietType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) foodPreferences?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) foodRestrictions?: string[];
  @IsOptional() @Matches(timePattern) wakeTime?: string;
  @IsOptional() @IsString() workSchedule?: string;
  @IsOptional() @Matches(timePattern) preferredGymTime?: string;
  @IsOptional() @Matches(timePattern) sleepTime?: string;
  @IsOptional() @IsInt() @Min(1) @Max(6) currentStep?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
}
