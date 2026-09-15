import { IsInt, Max, Min } from 'class-validator';

export class UpdateActivitySettingsDto {
  @IsInt() @Min(1000) @Max(100000) stepGoal!: number;
}