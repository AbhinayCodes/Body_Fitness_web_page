import { FitnessStateRepository } from '../data-access/fitness-state.repository';
import type { FitnessState } from '../data-access/fitness-state.types';
export declare class StateService {
    private readonly repository;
    constructor(repository: FitnessStateRepository);
    getState(): Promise<FitnessState>;
}
