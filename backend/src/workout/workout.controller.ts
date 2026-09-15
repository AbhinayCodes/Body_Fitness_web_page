import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { WorkoutService } from './workout.service';
import { WorkoutPlanService } from './workout-plan.service';
import { UpdateWorkoutProgressDto } from './dto/update-workout-progress.dto';

@Controller(['api/v1/workouts', 'api/workouts'])
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService, private readonly workoutPlanService: WorkoutPlanService) {}

  @Get('plan')
  @UseGuards(JwtAuthGuard)
  getPlan(@CurrentUserId() userId: string) { return this.workoutPlanService.getPlan(userId); }

  @Put('today/progress')
  @UseGuards(JwtAuthGuard)
  updateTodayProgress(@CurrentUserId() userId: string, @Body() payload: UpdateWorkoutProgressDto) { return this.workoutService.updateTodayProgress(userId, payload); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createWorkout(@CurrentUserId() userId: string, @Body() payload: CreateWorkoutDto) {
    return this.workoutService.createWorkout(userId, payload);
  }
}
