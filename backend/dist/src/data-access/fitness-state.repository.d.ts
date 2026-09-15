import { type FitnessState } from './fitness-state.types';
export declare class FitnessStateRepository {
    private readonly logger;
    private readonly dataFile;
    private writeQueue;
    getState(): Promise<FitnessState>;
    updateState(mutator: (state: FitnessState) => void): Promise<FitnessState>;
    private saveState;
    private normalize;
}
