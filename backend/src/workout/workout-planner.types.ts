export type RichGoal = 'build_muscle' | 'lose_fat' | 'recomp' | 'lean_muscle' | 'maintain' | 'strength' | 'endurance' | 'athletic';

export interface WorkoutPreferences {
  enjoyedTypes?: string[];
  dislikedTypes?: string[];
  enjoyedPatterns?: string[];
  dislikedExerciseSlugs?: string[];
  cardioPreference?: 'love' | 'fine' | 'minimal';
}

export interface HealthContext {
  injuryAreas?: string[];
  mobilityLimitation?: 'none' | 'some' | 'significant';
  conditions?: string[];
  doctorExerciseRestriction?: boolean;
}

export interface RecoveryContext {
  deload?: boolean;
}

export interface WorkoutPlanningInput {
  primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingDays: string[];
  workoutDurationMinutes: 30 | 45 | 60 | 90;
  trainingLocation: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
  equipment: string[];
  richGoal?: RichGoal;
  preferences?: WorkoutPreferences;
  health?: HealthContext;
  recovery?: RecoveryContext;
}

export interface ExerciseConstraintInfo { constraintType: string; area: string | null; severity: string | null; }

export interface CatalogExercise {
  id: string;
  slug: string;
  name: string;
  muscleGroups: string[];
  movementPattern: string;
  equipment: string[];
  locations: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  suitableGoals: string[];
  instructions: string[];
  estimatedMinutes: number;
  category?: string;
  secondaryMuscleGroups?: string[];
  mechanics?: string | null;
  laterality?: string | null;
  status?: string;
  equipmentAlternatives?: string[];
  suitableExperience?: string[];
  constraints?: ExerciseConstraintInfo[];
}
export interface GeneratedWorkoutDay { weekday: string; title: string; targetMuscleGroups: string[]; estimatedMinutes: number; exercises: Array<{ exerciseId: string; exerciseOrder: number; sets: number; reps: string; restSeconds: number; instructions: string[] }>; }
export interface GeneratedWorkoutPlan { goal: string; experience: string; durationMinutes: number; trainingLocation: string; trainingDays: string[]; days: GeneratedWorkoutDay[]; requiresMedicalClearance?: boolean; safetyNotices?: string[]; }