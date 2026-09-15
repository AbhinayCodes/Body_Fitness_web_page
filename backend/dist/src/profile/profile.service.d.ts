import { FitnessStateRepository } from '../data-access/fitness-state.repository';
import type { Profile } from '../data-access/fitness-state.types';
import type { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileService {
    private readonly repository;
    constructor(repository: FitnessStateRepository);
    updateProfile(payload: UpdateProfileDto): Promise<Profile>;
}
