import { IsString, IsUUID } from 'class-validator';

export class ReplaceScheduledMealDto {
  @IsString() slot!: string;
  @IsUUID() recipeId!: string;
}