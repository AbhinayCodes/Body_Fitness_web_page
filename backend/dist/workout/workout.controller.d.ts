import { CreateWorkoutDto } from './dto/create-workout.dto';
import { WorkoutService } from './workout.service';
export declare class WorkoutController {
    private readonly workoutService;
    constructor(workoutService: WorkoutService);
    createWorkout(payload: CreateWorkoutDto): Promise<import("../data-access/fitness-state.types").WorkoutHistoryEntry>;
}
