import { FitnessRepository } from '../data-access/fitness.repository';
import type { FitnessState } from '../data-access/fitness-state.types';
export declare class StateService {
    private readonly repository;
    constructor(repository: FitnessRepository);
    getState(userId: string): Promise<FitnessState>;
}
