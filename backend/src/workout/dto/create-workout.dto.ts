import { IsArray, IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateWorkoutDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  exercises?: number[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMinutes?: number;
}
