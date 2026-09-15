import { IsOptional, IsString } from 'class-validator';

export class CreateMealDto {
  @IsOptional()
  @IsString()
  meal?: string;
}
