import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

class ExerciseProgressDto {
  @IsInt() @Min(0) exerciseIndex!: number;
  @IsInt() @Min(0) @Max(10) setsCompleted!: number;
}

export class UpdateWorkoutProgressDto {
  @IsUUID() workoutPlanDayId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ExerciseProgressDto) exercises!: ExerciseProgressDto[];
}