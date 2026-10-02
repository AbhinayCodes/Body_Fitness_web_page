// Phase (Prescription) — Workout Prescription layer.
//
// Answers "HOW should the user perform the selected exercises?" given a weekly structure (which
// answered "which exercises, in what sessions"). It assigns sets/reps/rest as RANGES plus
// qualitative intensity, role/priority, volume contribution and a session time estimate, and adds
// optional warm-up/cool-down guidance. It does NOT select exercises, build the split, or compute
// nutrition/long-term progression. Prescriptions are expressed as ranges, varying by goal, role
// (compound/isolation/core/conditioning), experience, frequency, difficulty, recovery and cautions.

import type { WeeklyStructure } from './workout-structure';
import type { RichGoal } from './workout-planner.types';

export interface Range { min: number; max: number }
export type IntensityGuidance = 'light' | 'moderate' | 'hard' | 'very-hard';
export type ExerciseRole = 'primary' | 'secondary' | 'accessory' | 'core' | 'conditioning' | 'mobility';
export type Modality = 'reps' | 'hold' | 'conditioning';

export interface ExercisePrescription {
  order: number;
  slug: string;
  name: string;
  movementPattern: string;
  role: ExerciseRole;
  priority: number; // 1 = most important to complete; used to triage when time is short
  modality: Modality;
  sets: Range;
  reps: Range | null;
  holdSeconds: Range | null;
  durationMinutes: Range | null;
  restSeconds: Range;
  intensity: IntensityGuidance;
  optional: boolean;
  volumeContribution: number; // working sets counted toward session volume (0 for conditioning/mobility)
  cautions: string[];
  note?: string;
}

export interface SessionGuidanceItem { label: string; durationMinutes?: number }
export interface SessionGuidance { label: string; items: SessionGuidanceItem[] }

export interface PrescribedSession {
  weekday: string;
  focus: string;
  warmUp?: SessionGuidance;
  exercises: ExercisePrescription[];
  coolDown?: SessionGuidance;
  estimatedMinutes: number;
  totalWorkingSets: number;
}

export interface WorkoutPrescription {
  archetype: string;
  rationale: string;
  sessions: PrescribedSession[];
}

export interface PrescriptionContext {
  primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
  richGoal?: RichGoal;
  secondaryGoals?: string[];
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingFrequency: number;
  workoutDurationMinutes: 30 | 45 | 60 | 90;
  recovery?: { deload?: boolean };
  requiresGentle?: boolean;
}

export interface ExerciseMeta { mechanics: string | null; difficulty: string; estimatedMinutes: number }

type Family = 'strength' | 'muscle' | 'fatloss' | 'endurance' | 'general';
interface Band { sets: Range; reps?: Range; hold?: Range; duration?: Range; rest: Range; intensity: IntensityGuidance }

const COMPOUND: Record<Family, Band> = {
  strength: { sets: { min: 3, max: 5 }, reps: { min: 3, max: 6 }, rest: { min: 150, max: 210 }, intensity: 'very-hard' },
  muscle: { sets: { min: 3, max: 4 }, reps: { min: 6, max: 10 }, rest: { min: 90, max: 150 }, intensity: 'hard' },
  fatloss: { sets: { min: 2, max: 4 }, reps: { min: 10, max: 15 }, rest: { min: 45, max: 75 }, intensity: 'moderate' },
  endurance: { sets: { min: 2, max: 3 }, reps: { min: 12, max: 20 }, rest: { min: 45, max: 60 }, intensity: 'moderate' },
  general: { sets: { min: 2, max: 3 }, reps: { min: 8, max: 12 }, rest: { min: 60, max: 90 }, intensity: 'moderate' },
};
const ISOLATION: Record<Family, Band> = {
  strength: { sets: { min: 2, max: 3 }, reps: { min: 6, max: 10 }, rest: { min: 90, max: 120 }, intensity: 'hard' },
  muscle: { sets: { min: 2, max: 4 }, reps: { min: 10, max: 15 }, rest: { min: 60, max: 90 }, intensity: 'moderate' },
  fatloss: { sets: { min: 2, max: 3 }, reps: { min: 12, max: 20 }, rest: { min: 30, max: 60 }, intensity: 'moderate' },
  endurance: { sets: { min: 2, max: 3 }, reps: { min: 15, max: 20 }, rest: { min: 30, max: 45 }, intensity: 'moderate' },
  general: { sets: { min: 2, max: 3 }, reps: { min: 10, max: 15 }, rest: { min: 45, max: 75 }, intensity: 'moderate' },
};
const CORE_REP: Band = { sets: { min: 2, max: 3 }, reps: { min: 10, max: 20 }, rest: { min: 30, max: 45 }, intensity: 'moderate' };
const CORE_HOLD: Band = { sets: { min: 2, max: 3 }, hold: { min: 20, max: 45 }, rest: { min: 30, max: 45 }, intensity: 'moderate' };
const MOBILITY: Band = { sets: { min: 1, max: 2 }, hold: { min: 20, max: 40 }, rest: { min: 15, max: 30 }, intensity: 'light' };
const CONDITIONING: Band = { sets: { min: 1, max: 1 }, duration: { min: 8, max: 15 }, rest: { min: 0, max: 0 }, intensity: 'moderate' };
const GENTLE: Band = { sets: { min: 1, max: 2 }, hold: { min: 20, max: 40 }, rest: { min: 30, max: 45 }, intensity: 'light' };

const INTENSITY_ORDER: IntensityGuidance[] = ['light', 'moderate', 'hard', 'very-hard'];
const ROLE_PRIORITY: Record<ExerciseRole, number> = { primary: 1, secondary: 2, accessory: 3, core: 4, conditioning: 5, mobility: 6 };
const downgrade = (intensity: IntensityGuidance, steps: number): IntensityGuidance => INTENSITY_ORDER[Math.max(0, INTENSITY_ORDER.indexOf(intensity) - steps)];
const capAt = (intensity: IntensityGuidance, max: IntensityGuidance): IntensityGuidance => (INTENSITY_ORDER.indexOf(intensity) > INTENSITY_ORDER.indexOf(max) ? max : intensity);
const mid = (range: Range) => Math.round((range.min + range.max) / 2);

function goalFamily(context: PrescriptionContext): Family {
  switch (context.richGoal) {
    case 'strength': return 'strength';
    case 'endurance': case 'athletic': return 'endurance';
    case 'lose_fat': return 'fatloss';
    case 'build_muscle': case 'lean_muscle': case 'recomp': return 'muscle';
    case 'maintain': return 'general';
    default: return context.primaryGoal === 'Lose fat' ? 'fatloss' : context.primaryGoal === 'Build muscle' ? 'muscle' : 'general';
  }
}

function isConditioning(category: string | undefined, pattern: string): boolean {
  return category === 'cardio' || category === 'conditioning' || pattern === 'conditioning';
}

function prescribeExercise(exercise: WeeklyStructure['days'][number]['exercises'][number], meta: ExerciseMeta | undefined, context: PrescriptionContext, family: Family, firstCompoundTaken: { value: boolean }): ExercisePrescription {
  const mechanics = meta?.mechanics ?? null;
  const category = exercise.category;
  const pattern = exercise.movementPattern;
  const conditioning = isConditioning(category, pattern);
  const mobility = category === 'mobility';
  const core = category === 'core';
  const isometric = mechanics === null && !conditioning && !mobility;
  const compound = mechanics === 'compound';

  const modality: Modality = conditioning ? 'conditioning' : (mobility || isometric || (core && mechanics === null)) ? 'hold' : 'reps';

  let role: ExerciseRole;
  if (conditioning) role = 'conditioning';
  else if (mobility) role = 'mobility';
  else if (core) role = 'core';
  else if (compound && !firstCompoundTaken.value) { role = 'primary'; firstCompoundTaken.value = true; }
  else if (compound) role = 'secondary';
  else role = 'accessory';

  let band: Band;
  if (context.requiresGentle) band = GENTLE;
  else if (conditioning) band = CONDITIONING;
  else if (mobility) band = MOBILITY;
  else if (modality === 'hold') band = core ? CORE_HOLD : { ...CORE_HOLD, hold: { min: 20, max: 40 } };
  else if (core) band = CORE_REP;
  else band = compound ? COMPOUND[family] : ISOLATION[family];

  const sets: Range = { ...band.sets };
  const rest: Range = { ...band.rest };
  let intensity = band.intensity;
  const notes: string[] = [];

  if (!context.requiresGentle) {
    // Experience scaling.
    if (context.trainingExperience === 'BEGINNER') { sets.max = Math.min(sets.max, 3); intensity = downgrade(intensity, 1); }
    else if (context.trainingExperience === 'ADVANCED') sets.max = Math.min(sets.max + 1, 6);
    // Higher-difficulty lifts get a little more rest for quality.
    if (meta?.difficulty === 'ADVANCED' && modality === 'reps') rest.max += 15;
    // Secondary goal nudges.
    const secondary = context.secondaryGoals ?? [];
    if (secondary.includes('Improve strength') && compound) intensity = capAt(INTENSITY_ORDER[Math.min(INTENSITY_ORDER.length - 1, INTENSITY_ORDER.indexOf(intensity) + 1)], 'very-hard');
    // Recovery / deload.
    if (context.recovery?.deload) { sets.max = Math.max(sets.min, sets.max - 1); intensity = downgrade(intensity, 1); notes.push('Reduced volume and effort while you recover.'); }
    // Safety: anything flagged with a caution is kept sub-maximal.
    if (exercise.cautions.length) { intensity = capAt(intensity, 'moderate'); notes.push('Stay within a comfortable, pain-free range.'); }
  } else {
    notes.push('Gentle effort only, pending medical clearance.');
  }
  sets.min = Math.min(sets.min, sets.max);

  const optional = !context.requiresGentle && ((conditioning && family !== 'fatloss' && family !== 'endurance') || (role === 'accessory' && context.workoutDurationMinutes <= 30));
  const volumeContribution = modality === 'reps' || (modality === 'hold' && !mobility) ? mid(sets) : 0;

  return {
    order: exercise.order,
    slug: exercise.slug,
    name: exercise.name,
    movementPattern: pattern,
    role,
    priority: ROLE_PRIORITY[role],
    modality,
    sets,
    reps: band.reps && modality === 'reps' ? { ...band.reps } : null,
    holdSeconds: band.hold && modality === 'hold' ? { ...band.hold } : null,
    durationMinutes: band.duration && modality === 'conditioning' ? { ...band.duration } : null,
    restSeconds: rest,
    intensity,
    optional,
    volumeContribution,
    cautions: exercise.cautions,
    note: notes.length ? notes.join(' ') : undefined,
  };
}

function estimateSeconds(prescription: ExercisePrescription): number {
  const sets = mid(prescription.sets);
  if (prescription.modality === 'conditioning' && prescription.durationMinutes) return mid(prescription.durationMinutes) * 60;
  if (prescription.modality === 'hold' && prescription.holdSeconds) return sets * (mid(prescription.holdSeconds) + mid(prescription.restSeconds));
  if (prescription.reps) return sets * (mid(prescription.reps) * 3 + mid(prescription.restSeconds));
  return sets * mid(prescription.restSeconds);
}

const requiredSeconds = (exercises: ExercisePrescription[]) => exercises.filter((exercise) => !exercise.optional).reduce((sum, exercise) => sum + estimateSeconds(exercise), 0);

// Deterministically trims a session to fit the available time: first make lowest-priority
// (latest, least important) non-primary work optional, then shave set counts toward their minimum.
// Primaries are never dropped; nothing is deleted — items are only flagged optional or reduced.
function fitToDuration(exercises: ExercisePrescription[], availableMinutes: number): void {
  const budgetSeconds = Math.max(0, availableMinutes) * 60;
  const byLeastImportant = (left: ExercisePrescription, right: ExercisePrescription) => right.priority - left.priority || right.order - left.order;
  let guard = 0;
  while (requiredSeconds(exercises) > budgetSeconds && guard++ < 50) {
    const required = exercises.filter((exercise) => !exercise.optional);
    const droppable = required.filter((exercise) => exercise.role !== 'primary').sort(byLeastImportant)[0];
    if (droppable) { droppable.optional = true; continue; }
    const trimmable = required.filter((exercise) => exercise.sets.max > exercise.sets.min).sort(byLeastImportant)[0];
    if (!trimmable) break;
    trimmable.sets.max = Math.max(trimmable.sets.min, trimmable.sets.max - 1);
  }
}

export function prescribeWorkout(structure: WeeklyStructure, context: PrescriptionContext, meta: Map<string, ExerciseMeta>): WorkoutPrescription {
  const family = goalFamily(context);
  const sessions: PrescribedSession[] = structure.days.map((day) => {
    const firstCompoundTaken = { value: false };
    const exercises = day.exercises.map((exercise) => prescribeExercise(exercise, meta.get(exercise.slug), context, family, firstCompoundTaken));

    const warmUp: SessionGuidance | undefined = context.requiresGentle ? undefined : { label: 'Warm-up', items: [{ label: 'Easy cardio to raise your heart rate', durationMinutes: context.workoutDurationMinutes <= 30 ? 3 : 5 }, { label: 'Dynamic mobility for the muscles in this session' }] };
    const coolDown: SessionGuidance | undefined = { label: 'Cool-down', items: [{ label: 'Easy walking to bring your heart rate down', durationMinutes: 3 }, { label: 'Light stretching for the muscles you trained' }] };
    const guidanceMinutes = (warmUp?.items ?? []).concat(coolDown?.items ?? []).reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);

    // Make the required work realistically fit the user's available time.
    if (!context.requiresGentle) fitToDuration(exercises, context.workoutDurationMinutes - guidanceMinutes);

    const committed = exercises.filter((exercise) => !exercise.optional);
    const estimatedMinutes = Math.round(requiredSeconds(exercises) / 60) + guidanceMinutes;
    const totalWorkingSets = committed.reduce((sum, exercise) => sum + exercise.volumeContribution, 0);

    return { weekday: day.weekday, focus: day.focus, warmUp, exercises, coolDown, estimatedMinutes, totalWorkingSets };
  });

  return { archetype: structure.archetype, rationale: structure.rationale, sessions };
}
