// Exercise categorization vocabulary (Phase 1).
//
// This file is the single source of truth for the controlled values used to categorize
// exercises. It deliberately contains NO workout-generation logic and NO exercise records —
// only the taxonomy that exercise data and the future workout/safety engines will reference.
// Movement patterns are represented explicitly (not inferred from muscle names) and the lists
// are open: new values can be appended here without schema changes.

export const EXERCISE_CATEGORIES = ['resistance', 'cardio', 'mobility', 'core', 'conditioning'] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_MECHANICS = ['compound', 'isolation'] as const;
export type ExerciseMechanics = (typeof EXERCISE_MECHANICS)[number];

export const EXERCISE_LATERALITY = ['bilateral', 'unilateral'] as const;
export type ExerciseLaterality = (typeof EXERCISE_LATERALITY)[number];

export const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXERCISE_STATUSES = ['active', 'draft', 'archived'] as const;
export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];

// Movement patterns grouped by region. These are canonical identifiers, not an exhaustive set —
// additional patterns can be added to the relevant group as the catalog grows.
export const MOVEMENT_PATTERNS = {
  upperBody: ['horizontal-push', 'horizontal-pull', 'vertical-push', 'vertical-pull', 'elbow-flexion', 'elbow-extension', 'shoulder-abduction'],
  lowerBody: ['squat', 'hip-hinge', 'knee-extension', 'knee-flexion', 'hip-extension', 'calf', 'single-leg'],
  core: ['anti-extension', 'anti-rotation', 'anti-lateral-flexion', 'trunk-flexion', 'trunk-extension', 'core'],
  conditioning: ['conditioning', 'locomotion'],
  mobility: ['thoracic-mobility', 'hip-mobility', 'ankle-mobility', 'shoulder-mobility', 'full-body-mobility'],
} as const;

export type MovementRegion = keyof typeof MOVEMENT_PATTERNS;
export const ALL_MOVEMENT_PATTERNS: readonly string[] = Object.values(MOVEMENT_PATTERNS).flat();

export function regionForPattern(pattern: string): MovementRegion | undefined {
  return (Object.keys(MOVEMENT_PATTERNS) as MovementRegion[]).find((region) => (MOVEMENT_PATTERNS[region] as readonly string[]).includes(pattern));
}
export function isKnownMovementPattern(pattern: string): boolean {
  return ALL_MOVEMENT_PATTERNS.includes(pattern);
}

// How two exercises relate. Keeps relationships structured instead of free text.
export const RELATION_TYPES = [
  'variation',
  'alternative-same-pattern',
  'alternative-similar-emphasis',
  'alternative-different-equipment',
  'easier',
  'harder',
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

// Interpretable constraint metadata for a future safety engine. These describe the demands an
// exercise places on the body; they do NOT encode medical rules or diagnose conditions.
export const CONSTRAINT_TYPES = [
  'joint-load',
  'impact',
  'balance-demand',
  'range-of-motion',
  'technical-demand',
  'spinal-load',
] as const;
export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

export const BODY_AREAS = ['knee', 'hip', 'ankle', 'lower-back', 'neck', 'shoulder', 'wrist', 'elbow'] as const;
export type BodyArea = (typeof BODY_AREAS)[number];

export const CONSTRAINT_SEVERITIES = ['low', 'moderate', 'high'] as const;
export type ConstraintSeverity = (typeof CONSTRAINT_SEVERITIES)[number];

// Canonical equipment vocabulary used by exercise records. 'None' (bodyweight) is represented by
// an empty equipment array rather than a value here.
export const EQUIPMENT = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'] as const;
export type Equipment = (typeof EQUIPMENT)[number];
