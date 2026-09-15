import { Injectable } from '@nestjs/common';
import { FitnessRepository } from '../data-access/fitness.repository';
import type { MealHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateMealDto } from './dto/create-meal.dto';

@Injectable()
export class MealService {
  constructor(private readonly repository: FitnessRepository) {}

  async createMeal(userId: string, payload: CreateMealDto): Promise<MealHistoryEntry> {
    return this.repository.createMeal(userId, payload);
  }
}
