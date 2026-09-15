import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateMealDto } from './dto/create-meal.dto';
import { MealService } from './meal.service';

@Controller(['api/v1/meals', 'api/meals'])
export class MealController {
  constructor(private readonly mealService: MealService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createMeal(@Body() payload: CreateMealDto) {
    return this.mealService.createMeal(payload);
  }
}
