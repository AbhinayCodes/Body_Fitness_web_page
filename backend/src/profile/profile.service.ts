import { Injectable } from '@nestjs/common';
import { FitnessRepository } from '../data-access/fitness.repository';
import type { Profile } from '../data-access/fitness-state.types';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly repository: FitnessRepository) {}

  async updateProfile(userId: string, payload: UpdateProfileDto): Promise<Profile> {
    return this.repository.updateProfile(userId, payload);
  }
}
