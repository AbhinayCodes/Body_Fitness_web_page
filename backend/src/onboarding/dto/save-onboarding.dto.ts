import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateBy, ValidateIf } from 'class-validator';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SaveOnboardingDto {
  @ValidateIf((value) => value.completed || value.age !== undefined) @IsInt() @Min(13) @Max(100) age?: number;
  @ValidateIf((value) => value.completed || value.sex !== undefined) @IsIn(['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']) sex?: string;
  @ValidateIf((value) => value.completed || value.heightCm !== undefined) @IsInt() @Min(100) @Max(250) heightCm?: number;
  @ValidateIf((value) => value.completed || value.weightKg !== undefined) @IsInt() @Min(25) @Max(350) weightKg?: number;
  @ValidateIf((value) => value.completed || value.primaryGoal !== undefined) @IsIn(['Build muscle', 'Lose fat', 'Maintain fitness']) primaryGoal?: string;
  @IsOptional() @IsString() secondaryGoal?: string;
  @IsOptional() @IsArray() @IsIn(['Improve strength', 'Improve endurance', 'Improve mobility', 'Build consistency'], { each: true }) secondaryGoals?: string[];
  @ValidateIf((value) => value.completed || value.trainingExperience !== undefined) @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) trainingExperience?: string;
  @ValidateIf((value) => value.completed || value.trainingDays !== undefined)
  @IsArray()
  @ValidateBy({
    name: 'trainingDaysRequiredWhenCompleted',
    validator: {
      validate: (days: unknown, args) => !(args?.object as SaveOnboardingDto).completed || (Array.isArray(days) && days.length > 0),
      defaultMessage: () => 'Choose at least one training day before completing your setup.',
    },
  })
  @IsIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], { each: true })
  trainingDays?: string[];
  @ValidateIf((value) => value.completed || value.workoutDurationMinutes !== undefined) @IsIn([30, 45, 60, 90]) workoutDurationMinutes?: number;
  @ValidateIf((value) => value.completed || value.trainingLocation !== undefined) @IsIn(['HOME', 'GYM', 'OUTDOOR', 'MIXED']) trainingLocation?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) equipment?: string[];
  @ValidateIf((value) => value.completed || value.dietType !== undefined) @IsIn(['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference']) dietType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) foodPreferences?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) foodRestrictions?: string[];
  @ValidateIf((value) => value.completed || value.wakeTime !== undefined) @Matches(timePattern) wakeTime?: string;
  @ValidateIf((value) => value.completed || value.workSchedule !== undefined) @IsString() workSchedule?: string;
  @ValidateIf((value) => value.completed || value.preferredGymTime !== undefined) @Matches(timePattern) preferredGymTime?: string;
  @ValidateIf((value) => value.completed || value.sleepTime !== undefined) @Matches(timePattern) sleepTime?: string;
  @IsOptional() @IsIn(['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE']) dailyActivity?: string;
  @IsOptional() @IsInt() @Min(1) @Max(6) currentStep?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
}
