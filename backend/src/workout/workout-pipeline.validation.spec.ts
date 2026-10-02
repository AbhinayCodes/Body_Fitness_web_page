import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type CandidateResult, type RelationEdge } from './exercise-candidates';
import { generateWeeklyStructure, type StructureContext } from './workout-structure';
import { prescribeWorkout, type ExerciseMeta, type PrescriptionContext } from './workout-prescription';
import { validateWorkout, type ValidatedWorkout } from './workout-validation';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from './exercise-library';
import type { CatalogExercise, HealthContext, RichGoal, WorkoutPreferences } from './workout-planner.types';

// ---- Full pipeline under test: candidates -> selection -> structure -> prescription -> validation ----
const constraintsBySlug = new Map<string, Array<{ constraintType: string; area: string | null; severity: string | null }>>();
for (const constraint of exerciseConstraints) {
  const list = constraintsBySlug.get(constraint.slug) ?? [];
  list.push({ constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity });
  constraintsBySlug.set(constraint.slug, list);
}
const catalog: CatalogExercise[] = exerciseLibrary.map((exercise) => ({ ...exercise, id: exercise.slug, constraints: constraintsBySlug.get(exercise.slug) ?? [] }));
const relations: RelationEdge[] = exerciseRelations.map((relation) => ({ from: relation.from, to: relation.to, relationType: relation.relationType }));
const META: Map<string, ExerciseMeta> = new Map(exerciseLibrary.map((exercise) => [exercise.slug, { mechanics: exercise.mechanics, difficulty: exercise.difficulty, estimatedMinutes: exercise.estimatedMinutes }]));
const bySlug = new Map(catalog.map((exercise) => [exercise.slug, exercise]));
const GYM = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];
const weekdays = (n: number) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, n);
const EXERCISE_KEYS = ['order', 'slug', 'name', 'movementPattern', 'role', 'priority', 'modality', 'sets', 'reps', 'holdSeconds', 'durationMinutes', 'restSeconds', 'intensity', 'optional', 'volumeContribution', 'cautions', 'note'];

interface Profile {
  name: string;
  primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
  richGoal?: RichGoal;
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingLocation: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
  equipment: string[];
  trainingDays: string[];
  workoutDurationMinutes: 30 | 45 | 60 | 90;
  preferences?: WorkoutPreferences;
  health?: HealthContext;
  recovery?: { deload?: boolean };
}

function runPipeline(profile: Profile): { pool: CandidateResult; validated: ValidatedWorkout } {
  const query: CandidateQuery = { primaryGoal: profile.primaryGoal, trainingExperience: profile.trainingExperience, trainingLocation: profile.trainingLocation, equipment: profile.equipment, richGoal: profile.richGoal, preferences: profile.preferences, health: profile.health, recovery: profile.recovery };
  const pool = getExerciseCandidates(catalog, relations, query);
  const structureContext: StructureContext = { primaryGoal: profile.primaryGoal, richGoal: profile.richGoal, trainingExperience: profile.trainingExperience, trainingDays: profile.trainingDays, workoutDurationMinutes: profile.workoutDurationMinutes, recovery: profile.recovery, requiresGentle: pool.requiresMedicalClearance };
  const structure = generateWeeklyStructure(pool.candidates, structureContext);
  const prescriptionContext: PrescriptionContext = { primaryGoal: profile.primaryGoal, richGoal: profile.richGoal, trainingExperience: profile.trainingExperience, trainingFrequency: profile.trainingDays.length, workoutDurationMinutes: profile.workoutDurationMinutes, recovery: profile.recovery, requiresGentle: pool.requiresMedicalClearance };
  const prescription = prescribeWorkout(structure, prescriptionContext, META);
  const validated = validateWorkout(prescription, { workoutDurationMinutes: profile.workoutDurationMinutes, requiresGentle: pool.requiresMedicalClearance });
  return { pool, validated };
}

function assertFinalWorkout(profile: Profile, pool: CandidateResult, validated: ValidatedWorkout) {
  expect(validated.sessions.length).toBe(profile.trainingDays.length); // correct day count
  for (const session of validated.sessions) {
    expect(session.withinBudget).toBe(true); // realistic duration
    expect(session.committedMinutes).toBeLessThanOrEqual(profile.workoutDurationMinutes);
    const committed = session.exercises.filter((exercise) => !exercise.optional);
    expect(committed.length).toBeGreaterThan(0);
    if (!pool.requiresMedicalClearance) expect(committed.some((exercise) => exercise.role === 'primary')).toBe(true); // essential work kept

    const patternCounts: Record<string, number> = {};
    for (const exercise of committed) {
      // No stray nutrition/calorie fields leaked into the prescription.
      for (const key of Object.keys(exercise)) expect(EXERCISE_KEYS).toContain(key);
      // Sets / reps / rest sanity.
      expect(exercise.sets.min).toBeGreaterThanOrEqual(1);
      expect(exercise.sets.min).toBeLessThanOrEqual(exercise.sets.max);
      expect(exercise.sets.max).toBeLessThanOrEqual(6);
      expect(exercise.restSeconds.min).toBeGreaterThanOrEqual(0);
      expect(exercise.restSeconds.min).toBeLessThanOrEqual(exercise.restSeconds.max);
      expect(exercise.restSeconds.max).toBeLessThanOrEqual(300);
      if (exercise.modality === 'reps') { expect(exercise.reps).not.toBeNull(); expect(exercise.reps!.min).toBeGreaterThanOrEqual(1); expect(exercise.reps!.min).toBeLessThanOrEqual(exercise.reps!.max); expect(exercise.reps!.max).toBeLessThanOrEqual(30); }
      if (exercise.modality === 'hold') expect(exercise.holdSeconds).not.toBeNull();
      if (exercise.modality === 'conditioning') expect(exercise.durationMinutes).not.toBeNull();
      if (profile.trainingExperience === 'BEGINNER') expect(exercise.sets.max).toBeLessThanOrEqual(3); // experience considered

      const record = bySlug.get(exercise.slug)!;
      expect(record.equipment.every((item) => profile.equipment.includes(item))).toBe(true); // equipment compatible
      if (!pool.requiresMedicalClearance) {
        const constraints = record.constraints ?? [];
        for (const area of profile.health?.injuryAreas ?? []) expect(constraints.some((constraint) => constraint.area === area && (constraint.severity === 'moderate' || constraint.severity === 'high'))).toBe(false);
        if (exercise.role !== 'core' && exercise.role !== 'conditioning') patternCounts[exercise.movementPattern] = (patternCounts[exercise.movementPattern] ?? 0) + 1;
      }
    }
    for (const count of Object.values(patternCounts)) expect(count).toBeLessThanOrEqual(2); // no excessive duplication
  }
}

const scenarios: Profile[] = [
  { name: '1. Beginner + muscle gain + 3 days', primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(3), workoutDurationMinutes: 60 },
  { name: '2. Beginner + fat loss + 3 days', primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(3), workoutDurationMinutes: 45 },
  { name: '3. Beginner + recomposition + 4 days', primaryGoal: 'Maintain fitness', richGoal: 'recomp', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 },
  { name: '4. Intermediate + muscle gain + 4 days', primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 },
  { name: '5. Advanced + strength + 5 days', primaryGoal: 'Build muscle', richGoal: 'strength', trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(5), workoutDurationMinutes: 60 },
  { name: '6. Home + dumbbells', primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'HOME', equipment: ['Dumbbells'], trainingDays: weekdays(4), workoutDurationMinutes: 60 },
  { name: '7. Bodyweight-only', primaryGoal: 'Maintain fitness', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: [], trainingDays: weekdays(3), workoutDurationMinutes: 45 },
  { name: '8. Full gym', primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 },
  { name: '9. 20-30 minute sessions', primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(3), workoutDurationMinutes: 30 },
  { name: '10. 30-45 minute sessions', primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 45 },
  { name: '11. 45-60 minute sessions', primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 },
  { name: '12. 60-90 minute sessions', primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(5), workoutDurationMinutes: 90 },
  { name: '13. Limited equipment (bands)', primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: ['Resistance bands'], trainingDays: weekdays(3), workoutDurationMinutes: 45 },
  { name: '14. Exercise preferences', primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, preferences: { enjoyedTypes: ['bodyweight'], enjoyedPatterns: ['squat'] } },
  { name: '15. Exercise dislikes', primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, preferences: { dislikedExerciseSlugs: ['barbell-back-squat', 'front-squat'], dislikedTypes: ['cardio'] } },
  { name: '16. Physical limitations (knee)', primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, health: { injuryAreas: ['knee'], mobilityLimitation: 'some' } },
  { name: '17. Recovery context (deload)', primaryGoal: 'Build muscle', trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, recovery: { deload: true } },
  { name: '18. Higher training frequency (6 days)', primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(6), workoutDurationMinutes: 60 },
];

describe('Phase 10 — full prescription pipeline matrix', () => {
  it.each(scenarios)('$name produces a valid final workout', (profile) => {
    const { pool, validated } = runPipeline(profile);
    assertFinalWorkout(profile, pool, validated);
  });
});

describe('Phase 10 — goal, variety and integrity', () => {
  it('reflects a strength goal in the primary prescription', () => {
    const { validated } = runPipeline(scenarios[4]);
    const primary = validated.sessions.flatMap((session) => session.exercises).find((exercise) => exercise.role === 'primary' && exercise.reps)!;
    expect(primary.reps!.max).toBeLessThanOrEqual(6);
    expect(primary.restSeconds.min).toBeGreaterThanOrEqual(120);
  });

  it('reflects a fat-loss goal with higher reps and shorter rest', () => {
    const { validated } = runPipeline(scenarios[1]);
    const primary = validated.sessions.flatMap((session) => session.exercises).find((exercise) => exercise.role === 'primary' && exercise.reps)!;
    expect(primary.reps!.min).toBeGreaterThanOrEqual(10);
    expect(primary.restSeconds.max).toBeLessThanOrEqual(90);
  });

  it('does not use a universal 3x10 prescription', () => {
    const { validated } = runPipeline(scenarios[11]);
    const repSignatures = new Set(validated.sessions.flatMap((session) => session.exercises).filter((exercise) => exercise.reps).map((exercise) => `${exercise.sets.min}-${exercise.sets.max}x${exercise.reps!.min}-${exercise.reps!.max}`));
    expect(repSignatures.size).toBeGreaterThan(1);
  });

  it('gives materially different final workouts to different users', () => {
    const a = JSON.stringify(runPipeline(scenarios[0]).validated.sessions);
    const b = JSON.stringify(runPipeline(scenarios[4]).validated.sessions);
    const c = JSON.stringify(runPipeline(scenarios[6]).validated.sessions);
    expect(a === b || b === c || a === c).toBe(false);
  });

  it('introduces no fake assumptions when optional information is missing', () => {
    const minimal: Profile = { name: 'minimal', primaryGoal: 'Maintain fitness', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: [], trainingDays: weekdays(2), workoutDurationMinutes: 30 };
    const { pool, validated } = runPipeline(minimal);
    expect(pool.requiresMedicalClearance).toBe(false);
    const notes = validated.sessions.flatMap((session) => session.exercises).flatMap((exercise) => [exercise.note ?? '', ...exercise.cautions]);
    expect(notes.some((note) => note.includes('reduce range') || note.includes('pain-free'))).toBe(false);
  });

  it('is deterministic end-to-end', () => {
    expect(runPipeline(scenarios[3]).validated).toEqual(runPipeline(scenarios[3]).validated);
  });
});
