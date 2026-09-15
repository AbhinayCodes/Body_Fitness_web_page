import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecipeServingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) servings?: number;
}