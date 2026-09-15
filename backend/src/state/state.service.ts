import { Injectable } from '@nestjs/common';
import { FitnessRepository } from '../data-access/fitness.repository';
import type { FitnessState } from '../data-access/fitness-state.types';

@Injectable()
export class StateService {
  constructor(private readonly repository: FitnessRepository) {}

  getState(userId: string): Promise<FitnessState> {
    return this.repository.getState(userId);
  }
}
