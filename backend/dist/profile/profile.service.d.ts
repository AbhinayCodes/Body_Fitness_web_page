import { FitnessRepository } from '../data-access/fitness.repository';
import type { Profile } from '../data-access/fitness-state.types';
import type { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileService {
    private readonly repository;
    constructor(repository: FitnessRepository);
    updateProfile(userId: string, payload: UpdateProfileDto): Promise<Profile>;
}
