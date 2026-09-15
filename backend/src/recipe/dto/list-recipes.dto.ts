import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum RecipeDietFilter { VEGETARIAN = 'VEGETARIAN', NON_VEGETARIAN = 'NON_VEGETARIAN', VEGAN = 'VEGAN' }
export enum RecipeMealCategoryFilter { BREAKFAST = 'BREAKFAST', LUNCH = 'LUNCH', SNACK = 'SNACK', DINNER = 'DINNER', PRE_WORKOUT = 'PRE_WORKOUT', POST_WORKOUT = 'POST_WORKOUT' }

export class ListRecipesDto {
  @IsOptional() @IsEnum(RecipeDietFilter) dietType?: RecipeDietFilter;
  @IsOptional() @IsEnum(RecipeMealCategoryFilter) mealCategory?: RecipeMealCategoryFilter;
  @IsOptional() @Transform(({ value }) => Array.isArray(value) ? value.map((item) => String(item).trim().toUpperCase()) : String(value).split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)) @IsArray() @IsString({ each: true }) restrictions?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) servings?: number;
}