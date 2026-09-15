export type View = 'dashboard' | 'workout' | 'diet' | 'calendar' | 'progress' | 'profile';
export type Modal = 'workout' | 'meal' | 'onboarding' | null;

export interface Profile {
  name: string;
  goal: string;
  days: string;
  diet: string;
}

export interface FitnessState {
  profile: Profile;
  mealDone: boolean;
  workoutHistory: Array<{ date: string; exercises: number[]; durationMinutes: number }>;
  mealHistory: Array<{ date: string; meal: string }>;
}

export interface OnboardingData {
  age?: number;
  sex?: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  heightCm?: number;
  weightKg?: number;
  primaryGoal?: string;
  secondaryGoal?: string;
  trainingExperience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingDays?: string[];
  workoutDurationMinutes?: number;
  trainingLocation?: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
  equipment?: string[];
  dietType?: string;
  foodPreferences?: string[];
  foodRestrictions?: string[];
  wakeTime?: string;
  workSchedule?: string;
  preferredGymTime?: string;
  sleepTime?: string;
  currentStep?: number;
  completed?: boolean;
}

export interface AppState {
  view: View;
  modal: Modal;
  step: number;
  mealDone: boolean;
  exerciseDone: number[];
  profile: Profile;
}
