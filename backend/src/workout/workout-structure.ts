// Phase 5 — Personalized Workout Structure Generation.
//
// Turns the Phase 3 candidate pool (+ user context) into a weekly workout structure: it chooses a
// split archetype from the user's goal, experience, recovery and available days (NOT a rigid
// day-count template), assigns a focus + movement requirements to each available day, selects
// exercises per session via the Phase 4 selector, orders them, and keeps each session within the
// user's duration budget. It does NOT assign sets/reps/intensity/progression.

import type { ExerciseCandidate } from './exercise-candidates';
import { selectExercises } from './exercise-selector';
import type { RichGoal } from './workout-planner.types';

export interface StructureContext {
  primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
  richGoal?: RichGoal;
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingDays: string[];
  workoutDurationMinutes: 30 | 45 | 60 | 90;
  recovery?: { deload?: boolean };
  priorityMuscles?: string[];
  requiresGentle?: boolean;
}

export interface StructuredExercise { order: number; slug: string; name: string; movementPattern: string; category?: string; muscleGroups: string[]; reasons: string[]; cautions: string[] }
export interface StructuredDay { weekday: string; focus: string; movementRequirements: string[]; targetMuscleGroups: string[]; estimatedMinutes: number; uncoveredPatterns: string[]; exercises: StructuredExercise[] }
export interface WeeklyStructure { archetype: string; rationale: string; days: StructuredDay[] }

interface SessionTemplate { focus: string; patterns: string[]; targetMuscles?: string[] }
interface Archetype { id: string; rationale: string; sequence: SessionTemplate[] }

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CAPACITY = { 30: 3, 45: 4, 60: 5, 90: 6 } as const;

// Pattern sets per session focus (compound-first so the selected order reads compound -> accessory -> core).
const FULL = ['squat', 'horizontal-push', 'horizontal-pull', 'hip-hinge', 'core'];
const FULL_CONDITIONING = ['squat', 'horizontal-push', 'conditioning', 'hip-hinge', 'horizontal-pull', 'core'];
const STRENGTH_FULL = ['squat', 'hip-hinge', 'horizontal-push', 'horizontal-pull', 'vertical-push'];
const UPPER = ['horizontal-push', 'horizontal-pull', 'vertical-push', 'vertical-pull', 'core'];
const LOWER = ['squat', 'hip-hinge', 'single-leg', 'calf', 'core'];
const PUSH = ['horizontal-push', 'vertical-push', 'elbow-extension', 'core'];
const PULL = ['horizontal-pull', 'vertical-pull', 'elbow-flexion', 'core'];
const LEGS = ['squat', 'hip-hinge', 'single-leg', 'calf'];

type GoalFamily = 'strength' | 'endurance' | 'fatloss' | 'muscle' | 'general';
function goalFamily(context: StructureContext): GoalFamily {
  switch (context.richGoal) {
    case 'strength': return 'strength';
    case 'endurance': case 'athletic': return 'endurance';
    case 'lose_fat': return 'fatloss';
    case 'build_muscle': case 'lean_muscle': case 'recomp': return 'muscle';
    case 'maintain': return 'general';
    default: return context.primaryGoal === 'Lose fat' ? 'fatloss' : context.primaryGoal === 'Build muscle' ? 'muscle' : 'general';
  }
}

export function chooseArchetype(context: StructureContext): Archetype {
  const days = context.trainingDays.length;
  const experience = context.trainingExperience;
  const family = goalFamily(context);
  const spec = context.priorityMuscles && context.priorityMuscles.length ? context.priorityMuscles : undefined;

  if (context.requiresGentle) return { id: 'gentle-movement', rationale: 'Gentle, low-impact movement only, pending medical clearance.', sequence: [{ focus: 'Gentle movement', patterns: [] }] };
  if (context.recovery?.deload) return { id: 'full-body', rationale: 'Full-body sessions at a reduced load while you ease back in.', sequence: [{ focus: 'Full body', patterns: FULL }] };
  if (family === 'endurance' || family === 'fatloss') return { id: 'full-body-conditioning', rationale: 'Conditioning-oriented full-body sessions to support your goal.', sequence: [{ focus: 'Full body + conditioning', patterns: FULL_CONDITIONING }] };
  if (family === 'strength') {
    return days >= 4 && experience !== 'BEGINNER'
      ? { id: 'upper-lower-strength', rationale: 'Upper/lower split emphasising compound strength lifts.', sequence: [{ focus: 'Upper strength', patterns: UPPER }, { focus: 'Lower strength', patterns: LOWER }] }
      : { id: 'full-body-strength', rationale: 'Compound-focused full-body strength sessions.', sequence: [{ focus: 'Full-body strength', patterns: STRENGTH_FULL }] };
  }
  if (experience === 'BEGINNER') {
    return spec
      ? { id: 'full-body-specialization', rationale: 'Full-body sessions with light emphasis on your priority areas.', sequence: [{ focus: 'Full body + focus', patterns: FULL, targetMuscles: spec }] }
      : { id: 'full-body', rationale: 'Full-body sessions, ideal while building a base.', sequence: [{ focus: 'Full body', patterns: FULL }] };
  }
  if (days <= 3) {
    return spec
      ? { id: 'full-body-specialization', rationale: 'Full-body sessions with emphasis on your priority areas.', sequence: [{ focus: 'Full body + focus', patterns: FULL, targetMuscles: spec }] }
      : { id: 'full-body', rationale: 'Full-body sessions make the most of three or fewer days.', sequence: [{ focus: 'Full body', patterns: FULL }] };
  }
  if (days === 4) return { id: 'upper-lower', rationale: 'Upper/lower split for four quality sessions.', sequence: [{ focus: 'Upper body', patterns: UPPER }, { focus: 'Lower body', patterns: LOWER }] };
  if (experience === 'ADVANCED') return { id: 'push-pull-legs', rationale: 'Push/pull/legs split suited to a higher advanced training frequency.', sequence: [{ focus: 'Push', patterns: PUSH }, { focus: 'Pull', patterns: PULL }, { focus: 'Legs', patterns: LEGS }] };
  return { id: 'upper-lower', rationale: 'Upper/lower split rotated across your available days.', sequence: [{ focus: 'Upper body', patterns: UPPER }, { focus: 'Lower body', patterns: LOWER }] };
}

export function generateWeeklyStructure(candidates: ExerciseCandidate[], context: StructureContext): WeeklyStructure {
  const archetype = chooseArchetype(context);
  const sortedDays = [...context.trainingDays].sort((left, right) => WEEKDAY_ORDER.indexOf(left) - WEEKDAY_ORDER.indexOf(right));
  const capacity = CAPACITY[context.workoutDurationMinutes];

  const days: StructuredDay[] = sortedDays.map((weekday, index) => {
    const template = archetype.sequence[index % archetype.sequence.length];
    const targetMuscleGroups = template.targetMuscles ?? [];
    const selection = selectExercises(candidates, { requiredPatterns: template.patterns, exerciseCount: capacity, targetMuscleGroups });

    // Respect the duration budget: drop trailing (lowest-priority) exercises if the session runs long.
    let chosen = selection.selected;
    const minutesOf = (list: typeof chosen) => list.reduce((sum, exercise) => sum + exercise.estimatedMinutes, 0);
    while (chosen.length > 1 && minutesOf(chosen) > context.workoutDurationMinutes) chosen = chosen.slice(0, -1);

    return {
      weekday,
      focus: template.focus,
      movementRequirements: template.patterns,
      targetMuscleGroups,
      estimatedMinutes: minutesOf(chosen),
      uncoveredPatterns: selection.uncoveredPatterns,
      exercises: chosen.map((exercise, order) => ({ order, slug: exercise.slug, name: exercise.name, movementPattern: exercise.movementPattern, category: exercise.category, muscleGroups: exercise.muscleGroups, reasons: exercise.reasons, cautions: exercise.cautions })),
    };
  });

  return { archetype: archetype.id, rationale: archetype.rationale, days };
}
