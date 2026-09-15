export type NutritionSex = 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
export type NutritionGoal = 'Build muscle' | 'Lose fat' | 'Maintain fitness';
export type DailyActivity = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE';
export interface NutritionCalculationInput {
    age: number;
    sex: NutritionSex;
    heightCm: number;
    weightKg: number;
    trainingDays: string[];
    workoutDurationMinutes: 30 | 45 | 60 | 90;
    trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    trainingLocation: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
    primaryGoal: NutritionGoal;
    secondaryGoals?: string[];
    dailyActivity?: DailyActivity;
    workSchedule?: string;
    preferredGymTime?: string;
    requiresMedicalNutritionSupport?: boolean;
}
export interface NutritionTargets {
    calories: number;
    proteinGrams: number;
    fatGrams: number;
    carbohydrateGrams: number;
    fiberGrams: number;
}
export interface CalculationResult {
    status: 'READY' | 'UNDER_18' | 'MEDICAL_REFERRAL';
    targets?: NutritionTargets;
    metadata: {
        estimated: true;
        basalEnergyRequirement?: number;
        activityMultiplier?: number;
        estimatedDailyEnergyExpenditure?: number;
        goalAdjustmentCalories?: number;
        activitySource?: 'SELF_REPORTED' | 'TRAINING_DERIVED';
        message: string;
    };
}
