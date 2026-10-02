import { Injectable } from '@nestjs/common';
import { ExerciseCandidateService } from './exercise-candidates.service';
import { selectExercises, type SelectionRequirement, type SelectionResult } from './exercise-selector';

export interface PersonalizedSelection {
  requiresMedicalClearance: boolean;
  safetyNotices: string[];
  selection: SelectionResult;
}

// Reusable service: resolves a user's candidate pool (Phase 3) and selects a balanced set of
// exercises for a given training requirement (Phase 4). It does not build sets/reps or a full plan.
@Injectable()
export class ExerciseSelectionService {
  constructor(private readonly candidates: ExerciseCandidateService) {}

  async select(userId: string, requirement: SelectionRequirement): Promise<PersonalizedSelection> {
    const pool = await this.candidates.getCandidates(userId);
    return { requiresMedicalClearance: pool.requiresMedicalClearance, safetyNotices: pool.safetyNotices, selection: selectExercises(pool.candidates, requirement) };
  }
}
