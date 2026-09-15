import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMealDto } from './dto/create-meal.dto';
import { MealService } from './meal.service';

@Controller(['api/v1/meals', 'api/meals'])
export class MealController {
  constructor(private readonly mealService: MealService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createMeal(@CurrentUserId() userId: string, @Body() payload: CreateMealDto) {
    return this.mealService.createMeal(userId, payload);
  }
}
