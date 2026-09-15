import { StateService } from './state.service';
export declare class StateController {
    private readonly stateService;
    constructor(stateService: StateService);
    getState(userId: string): Promise<import("../data-access/fitness-state.types").FitnessState>;
}
