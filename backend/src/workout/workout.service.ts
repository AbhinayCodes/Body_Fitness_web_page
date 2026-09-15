import { Injectable } from '@nestjs/common';
import { FitnessRepository } from '../data-access/fitness.repository';
import type { WorkoutHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateWorkoutDto } from './dto/create-workout.dto';

@Injectable()
export class WorkoutService {
  constructor(private readonly repository: FitnessRepository) {}

  async createWorkout(payload: CreateWorkoutDto): Promise<WorkoutHistoryEntry> {
    return this.repository.createWorkout(payload);
  }
}
