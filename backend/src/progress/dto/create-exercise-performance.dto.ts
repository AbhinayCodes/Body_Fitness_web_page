import { IsDateString, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateExercisePerformanceDto {
  @IsUUID() exerciseId!: string;
  @IsDateString() recordedAt!: string;
  @IsInt() @Min(1) @Max(20) sets!: number;
  @IsInt() @Min(1) @Max(100) reps!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) weightKg?: number;
}