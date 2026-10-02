// Phase 9 — Workout Volume & Session-Time Validation.
//
// Evaluates an already-prescribed session for realism: a setup/transition-aware time estimate, time
// over/under budget, and unnecessary duplication. When a session cannot realistically fit the
// available time it is adjusted by PRIORITY (primaries are never removed; secondary/accessory then
// optional conditioning/core are reduced first) using structured, deterministic rules — never random
// truncation. It does not touch the exercise database and never relaxes safety (gentle/cautions).

import type { ExercisePrescription, ExerciseRole, PrescribedSession, Range, WorkoutPrescription } from './workout-prescription';

export interface ValidationContext { workoutDurationMinutes: number; requiresGentle?: boolean }

export interface SessionTimeBreakdown { workSeconds: number; restSeconds: number; setupSeconds: number; guidanceSeconds: number; totalMinutes: number }
export type ValidationSeverity = 'info' | 'warning' | 'adjusted';
export interface ValidationFinding { code: string; severity: ValidationSeverity; message: string }

export interface ValidatedSession {
  weekday: string;
  focus: string;
  exercises: ExercisePrescription[];
  committedMinutes: number;
  fullMinutes: number;
  totalWorkingSets: number;
  withinBudget: boolean;
  time: SessionTimeBreakdown;
  findings: ValidationFinding[];
}
export interface ValidatedWorkout { archetype: string; rationale: string; sessions: ValidatedSession[] }

// Per-exercise setup/loading time by role, plus flat transition time between exercises.
const SETUP_SECONDS: Record<ExerciseRole, number> = { primary: 60, secondary: 45, accessory: 25, core: 20, conditioning: 30, mobility: 15 };
const TRANSITION_SECONDS = 20;
const REP_TEMPO_SECONDS = 3;
const EXERCISE_CAP: Record<number, number> = { 30: 3, 45: 4, 60: 5, 90: 6 };
const UNDER_UTILIZATION_RATIO = 0.6;
const MAX_PER_PATTERN = 2;

const mid = (range: Range) => Math.round((range.min + range.max) / 2);

function executionSeconds(exercise: ExercisePrescription): number {
  const sets = mid(exercise.sets);
  if (exercise.modality === 'conditioning' && exercise.durationMinutes) return mid(exercise.durationMinutes) * 60;
  if (exercise.modality === 'hold' && exercise.holdSeconds) return sets * mid(exercise.holdSeconds);
  if (exercise.reps) return sets * mid(exercise.reps) * REP_TEMPO_SECONDS;
  return 0;
}
function interSetRestSeconds(exercise: ExercisePrescription): number {
  if (exercise.modality === 'conditioning') return 0;
  return Math.max(0, mid(exercise.sets) - 1) * mid(exercise.restSeconds);
}
const exerciseSeconds = (exercise: ExercisePrescription) => executionSeconds(exercise) + interSetRestSeconds(exercise) + SETUP_SECONDS[exercise.role];

function guidanceSeconds(session: PrescribedSession): number {
  const items = (session.warmUp?.items ?? []).concat(session.coolDown?.items ?? []);
  return items.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0) * 60;
}

function committedSeconds(exercises: ExercisePrescription[], guidance: number): number {
  const committed = exercises.filter((exercise) => !exercise.optional);
  const work = committed.reduce((sum, exercise) => sum + exerciseSeconds(exercise), 0);
  return work + committed.length * TRANSITION_SECONDS + guidance;
}

function breakdown(exercises: ExercisePrescription[], guidance: number): SessionTimeBreakdown {
  const committed = exercises.filter((exercise) => !exercise.optional);
  const workSeconds = committed.reduce((sum, exercise) => sum + executionSeconds(exercise), 0);
  const restSeconds = committed.reduce((sum, exercise) => sum + interSetRestSeconds(exercise), 0);
  const setupSeconds = committed.reduce((sum, exercise) => sum + SETUP_SECONDS[exercise.role], 0) + committed.length * TRANSITION_SECONDS;
  return { workSeconds, restSeconds, setupSeconds, guidanceSeconds: guidance, totalMinutes: Math.round((workSeconds + restSeconds + setupSeconds + guidance) / 60) };
}

const byLeastImportant = (left: ExercisePrescription, right: ExercisePrescription) => right.priority - left.priority || right.order - left.order;
const byMostImportant = (left: ExercisePrescription, right: ExercisePrescription) => left.priority - right.priority || left.order - right.order;

export function validateSession(session: PrescribedSession, context: ValidationContext): ValidatedSession {
  const exercises = session.exercises.map((exercise) => ({ ...exercise, sets: { ...exercise.sets } }));
  const guidance = guidanceSeconds(session);
  const budgetSeconds = context.workoutDurationMinutes * 60;
  const findings: ValidationFinding[] = [];

  if (context.requiresGentle) {
    const time = breakdown(exercises, guidance);
    findings.push({ code: 'gentle-session', severity: 'info', message: 'Gentle session left unadjusted; validation only reports time.' });
    return { weekday: session.weekday, focus: session.focus, exercises, committedMinutes: time.totalMinutes, fullMinutes: time.totalMinutes, totalWorkingSets: exercises.filter((exercise) => !exercise.optional).reduce((sum, exercise) => sum + exercise.volumeContribution, 0), withinBudget: committedSeconds(exercises, guidance) <= budgetSeconds, time, findings };
  }

  // 1) Remove unnecessary duplication: more than MAX_PER_PATTERN of the same movement pattern.
  const lockedOptional = new Set<ExercisePrescription>();
  const patternGroups = new Map<string, ExercisePrescription[]>();
  for (const exercise of exercises.filter((item) => !item.optional && item.role !== 'core' && item.role !== 'conditioning')) {
    const group = patternGroups.get(exercise.movementPattern) ?? [];
    group.push(exercise);
    patternGroups.set(exercise.movementPattern, group);
  }
  for (const [pattern, group] of patternGroups) {
    if (group.length <= MAX_PER_PATTERN) continue;
    for (const extra of group.sort(byLeastImportant).slice(0, group.length - MAX_PER_PATTERN)) { extra.optional = true; lockedOptional.add(extra); }
    findings.push({ code: 'duplication-pattern', severity: 'adjusted', message: `Reduced repeated ${pattern.replace(/-/g, ' ')} work to ${MAX_PER_PATTERN} movements.` });
  }

  // 2) Flag an unbalanced amount of accessory work relative to primary/secondary work.
  const committedNow = () => exercises.filter((exercise) => !exercise.optional);
  const accessoryCount = committedNow().filter((exercise) => exercise.role === 'accessory').length;
  const mainCount = committedNow().filter((exercise) => exercise.role === 'primary' || exercise.role === 'secondary').length;
  if (accessoryCount > mainCount && accessoryCount > 1) findings.push({ code: 'excess-accessory', severity: 'warning', message: 'Accessory work outweighs primary/secondary work for this session.' });

  // 3) Flag too many exercises for the available time (structure usually prevents this).
  const cap = EXERCISE_CAP[context.workoutDurationMinutes] ?? 6;
  if (committedNow().length > cap) findings.push({ code: 'too-many-exercises', severity: 'warning', message: `More exercises than typically fit a ${context.workoutDurationMinutes}-minute session.` });

  // 4) Fit to time by priority: drop least-important non-primary, then shave set counts.
  let adjustedForTime = false;
  let guard = 0;
  while (committedSeconds(exercises, guidance) > budgetSeconds && guard++ < 60) {
    const required = committedNow();
    const droppable = required.filter((exercise) => exercise.role !== 'primary').sort(byLeastImportant)[0];
    if (droppable) { droppable.optional = true; adjustedForTime = true; continue; }
    const trimmable = required.filter((exercise) => exercise.sets.max > exercise.sets.min).sort(byLeastImportant)[0];
    if (!trimmable) break;
    trimmable.sets.max = Math.max(trimmable.sets.min, trimmable.sets.max - 1);
    adjustedForTime = true;
  }
  if (adjustedForTime) findings.push({ code: 'time-over-adjusted', severity: 'adjusted', message: 'Reduced lower-priority work so the session fits your available time.' });

  // 5) Use spare time: if well under budget, promote the most important optional work back in.
  let promoted = false;
  for (const candidate of exercises.filter((exercise) => exercise.optional && !lockedOptional.has(exercise)).sort(byMostImportant)) {
    candidate.optional = false;
    if (committedSeconds(exercises, guidance) > budgetSeconds) { candidate.optional = true; break; }
    promoted = true;
  }
  if (committedSeconds(exercises, guidance) < budgetSeconds * UNDER_UTILIZATION_RATIO) findings.push({ code: 'under-utilized', severity: 'warning', message: 'Session is well under the available time; consider adding work or shortening the session.' });
  else if (promoted) findings.push({ code: 'time-under-adjusted', severity: 'adjusted', message: 'Added optional work back in to use the available time.' });

  if (!findings.some((finding) => finding.severity === 'adjusted' || finding.severity === 'warning')) findings.push({ code: 'ok', severity: 'info', message: 'Session volume and time are realistic for your available time.' });

  const time = breakdown(exercises, guidance);
  return { weekday: session.weekday, focus: session.focus, exercises, committedMinutes: time.totalMinutes, fullMinutes: Math.round((exercises.reduce((sum, exercise) => sum + exerciseSeconds(exercise), 0) + exercises.length * TRANSITION_SECONDS + guidance) / 60), totalWorkingSets: committedNow().reduce((sum, exercise) => sum + exercise.volumeContribution, 0), withinBudget: committedSeconds(exercises, guidance) <= budgetSeconds, time, findings };
}

export function validateWorkout(prescription: WorkoutPrescription, context: ValidationContext): ValidatedWorkout {
  return { archetype: prescription.archetype, rationale: prescription.rationale, sessions: prescription.sessions.map((session) => validateSession(session, context)) };
}
