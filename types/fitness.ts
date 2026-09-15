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

export interface GeneratedWorkoutPlan {
  id: string;
  durationMinutes: number;
  days: Array<{ id: string; weekday: string; title: string; targetMuscleGroups: string[]; estimatedMinutes: number; exercises: Array<{ id: string; exerciseOrder: number; sets: number; reps: string; restSeconds: number; exercise: { name: string; instructions: string[] } }> }>;
}

export interface DailySchedule {
  id: string;
  isTrainingDay: boolean;
  meals: Array<{ id: string; slot: string; scheduledMinutes: number; targetCalories: number; recipe: { name: string; calories: number; proteinGrams: number | { toString(): string }; preparationMinutes: number; nutritionBasis: string } }>;
}

export interface TodayExperience {
  status: 'READY' | 'UNDER_18' | 'MEDICAL_REFERRAL';
  date?: string;
  profile?: Profile | null;
  nutrition?: { targets?: { calories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number; fiberGrams: number }; metadata: { message: string } };
  schedule?: { id: string; isTrainingDay: boolean; meals: Array<{ id: string; slot: string; scheduledMinutes: number; eatenAt: string | null; alternativeRecipeIds: string[]; alternatives: Array<{ id: string; name: string; calories: number; proteinGrams: number | string }>; recipe: { id: string; name: string; calories: number; proteinGrams: number | string; carbohydrateGrams: number | string; fatGrams: number | string; fiberGrams: number | string; preparationMinutes: number; nutritionBasis: string } }>; workout: null | { id: string; title: string; estimatedMinutes: number; targetMuscleGroups: string[]; completedSets: number; targetSets: number; completedExerciseSets: Array<{ exerciseIndex: number; setsCompleted: number }>; completed: boolean; exercises: Array<{ exerciseOrder: number; sets: number; reps: string; restSeconds: number; exercise: { name: string; instructions: string[] } }> } };
  adherence?: { mealsCompleted: number; mealsPlanned: number; workoutCompletedSets: number; workoutTargetSets: number; consistencyPercent: number };
  activity?: { steps?: number | null; activeCalories?: number | null; sleepMinutes?: number | null; source: string } | null;
  message?: string;
}

export interface ProgressSummary {
  checkIn: { frequencyDays: number; due: boolean; dueDate: string; latest: { recordedAt: string; weightKg: number | string; measurements: Array<{ type: string; valueCm: number | string }> } | null; previous: { recordedAt: string; weightKg: number | string } | null; weightChangeKg: number | null; note: string };
  weightTrend: Array<{ date: string; weightKg: number }>;
  consistency: { plannedWorkouts: number; completedWorkouts: number; workoutCompletionPercent: number; mealsPlanned: number; mealsCompleted: number; mealAdherencePercent: number };
  performance: Array<{ date: string; exercise: string; sets: number; reps: number; weightKg: number | null }>;
}

export interface ReminderSettings { timezone: string; workoutEnabled: boolean; mealEnabled: boolean; preWorkoutEnabled: boolean; postWorkoutEnabled: boolean; checkInEnabled: boolean; workoutLeadMinutes: number; mealLeadMinutes: number; checkInTime: string; }

export interface ActivityToday { stepGoal: number; progress: number | null; primary: { source: string; steps?: number | null; distanceMeters?: number | null; activeCalories?: number | null; workoutDurationMinutes?: number | null; heartRateBpm?: number | null; sleepMinutes?: number | null } | null; sources: Array<{ source: string }>; note: string; }

export interface OnboardingData {
  age?: number;
  sex?: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  heightCm?: number;
  weightKg?: number;
  primaryGoal?: string;
  secondaryGoal?: string;
  secondaryGoals?: Array<'Improve strength' | 'Improve endurance' | 'Improve mobility' | 'Build consistency'>;
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
  dailyActivity?: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE';
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
