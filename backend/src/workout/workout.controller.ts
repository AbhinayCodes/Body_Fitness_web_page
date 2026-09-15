import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { WorkoutService } from './workout.service';

@Controller(['api/v1/workouts', 'api/workouts'])
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createWorkout(@Body() payload: CreateWorkoutDto) {
    return this.workoutService.createWorkout(payload);
  }
}
