import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../data-access/prisma.service';
import { contextFromOnboarding } from './onboarding-context';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
import { generateWeeklyStructure, type StructureContext } from './workout-structure';
import { prescribeWorkout, type ExerciseMeta, type ExercisePrescription, type PrescriptionContext } from './workout-prescription';
import { validateWorkout } from './workout-validation';
import type { CatalogExercise, RichGoal } from './workout-planner.types';

const FOCUS_TO_MUSCLE: Record<string, string> = { chest: 'chest', shoulders: 'shoulders', back: 'back', core: 'core', glutes: 'glutes', quads: 'quads', hamstrings: 'hamstrings', calves: 'calves', arms: 'biceps' };
const mid = (range: { min: number; max: number }) => Math.round((range.min + range.max) / 2);

function formatReps(exercise: ExercisePrescription): string {
  if (exercise.modality === 'conditioning' && exercise.durationMinutes) return `${exercise.durationMinutes.min}-${exercise.durationMinutes.max} min`;
  if (exercise.modality === 'hold' && exercise.holdSeconds) return `${exercise.holdSeconds.min}-${exercise.holdSeconds.max} sec`;
  if (exercise.reps) return `${exercise.reps.min}-${exercise.reps.max}`;
  return '-';
}

@Injectable()
export class WorkoutPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan(userId: string) {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.completed) throw new BadRequestException('Complete onboarding before generating a workout plan.');
    if (!onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingLocation || !onboarding.trainingDays.length) throw new BadRequestException('Your training profile is incomplete.');

    const derived = contextFromOnboarding(onboarding);
    const responses = (onboarding.responses ?? {}) as Record<string, unknown>;
    const richGoal = typeof responses.primaryGoal === 'string' ? (responses.primaryGoal as RichGoal) : undefined;
    const focusAreas = Array.isArray(responses.focusAreas) ? responses.focusAreas.filter((area): area is string => typeof area === 'string') : [];
    const priorityMuscles = [...new Set(focusAreas.map((area) => FOCUS_TO_MUSCLE[area]).filter(Boolean))];
    const primaryGoal = onboarding.primaryGoal as PrescriptionContext['primaryGoal'];
    const trainingExperience = onboarding.trainingExperience as PrescriptionContext['trainingExperience'];
    const workoutDurationMinutes = onboarding.workoutDurationMinutes as PrescriptionContext['workoutDurationMinutes'];
    const trainingLocation = onboarding.trainingLocation as CandidateQuery['trainingLocation'];

    const sourceFingerprint = createHash('sha256').update(JSON.stringify({
      primaryGoal, richGoal, trainingExperience, workoutDurationMinutes, trainingLocation,
      trainingDays: [...onboarding.trainingDays].sort(),
      equipment: [...derived.equipment].sort(),
      preferences: derived.preferences ?? null, health: derived.health ?? null, recovery: derived.recovery ?? null,
      priorityMuscles: [...priorityMuscles].sort(), secondaryGoals: [...onboarding.secondaryGoals].sort(),
    })).digest('hex');

    const existing = await this.prisma.workoutPlan.findUnique({ where: { userId_sourceFingerprint: { userId, sourceFingerprint } }, include: planInclude });
    if (existing) return existing;

    const [catalogRows, relationRows, performed] = await Promise.all([
      this.prisma.exercise.findMany({ include: { constraints: true } }),
      this.prisma.exerciseRelation.findMany({ select: { fromExerciseId: true, toExerciseId: true, relationType: true } }),
      this.prisma.exercisePerformance.findMany({ where: { userId }, distinct: ['exerciseId'], select: { exercise: { select: { slug: true } } } }),
    ]);

    const catalog = catalogRows as unknown as CatalogExercise[];
    const slugToId = new Map(catalogRows.map((exercise) => [exercise.slug, exercise.id]));
    const idToSlug = new Map(catalogRows.map((exercise) => [exercise.id, exercise.slug]));
    const musclesBySlug = new Map(catalogRows.map((exercise) => [exercise.slug, exercise.muscleGroups]));
    const meta: Map<string, ExerciseMeta> = new Map(catalogRows.map((exercise) => [exercise.slug, { mechanics: exercise.mechanics, difficulty: exercise.difficulty, estimatedMinutes: exercise.estimatedMinutes }]));
    const relations: RelationEdge[] = relationRows.flatMap((row) => {
      const from = idToSlug.get(row.fromExerciseId);
      const to = idToSlug.get(row.toExerciseId);
      return from && to ? [{ from, to, relationType: row.relationType }] : [];
    });
    const history = performed.map((performance) => performance.exercise.slug);

    // New pipeline: candidates -> structure -> prescription -> validation.
    const candidateQuery: CandidateQuery = { primaryGoal, trainingExperience, trainingLocation, equipment: derived.equipment, richGoal, preferences: derived.preferences, health: derived.health, recovery: derived.recovery, history };
    const pool = getExerciseCandidates(catalog, relations, candidateQuery);
    const structureContext: StructureContext = { primaryGoal, richGoal, trainingExperience, trainingDays: onboarding.trainingDays, workoutDurationMinutes, recovery: derived.recovery, priorityMuscles: priorityMuscles.length ? priorityMuscles : undefined, requiresGentle: pool.requiresMedicalClearance };
    const structure = generateWeeklyStructure(pool.candidates, structureContext);
    const prescriptionContext: PrescriptionContext = { primaryGoal, richGoal, secondaryGoals: onboarding.secondaryGoals, trainingExperience, trainingFrequency: onboarding.trainingDays.length, workoutDurationMinutes, recovery: derived.recovery, requiresGentle: pool.requiresMedicalClearance };
    const prescription = prescribeWorkout(structure, prescriptionContext, meta);
    const validated = validateWorkout(prescription, { workoutDurationMinutes, requiresGentle: pool.requiresMedicalClearance });

    // A plan that needs medical clearance is intentionally not persisted or cached.
    if (pool.requiresMedicalClearance) {
      return { requiresMedicalClearance: true, safetyNotices: pool.safetyNotices, durationMinutes: workoutDurationMinutes, prescription: validated, days: validated.sessions.map((sessionResult) => ({ weekday: sessionResult.weekday, title: sessionResult.focus, targetMuscleGroups: [], estimatedMinutes: sessionResult.committedMinutes, exercises: [] })) };
    }

    const days = validated.sessions.map((sessionResult, dayOrder) => {
      const committed = sessionResult.exercises.filter((exercise) => !exercise.optional);
      return {
        weekday: sessionResult.weekday,
        dayOrder,
        title: sessionResult.focus,
        targetMuscleGroups: [...new Set(committed.flatMap((exercise) => musclesBySlug.get(exercise.slug) ?? []))],
        estimatedMinutes: sessionResult.committedMinutes,
        exercises: {
          create: committed.map((exercise, exerciseOrder) => ({ exerciseId: slugToId.get(exercise.slug)!, exerciseOrder, sets: exercise.sets.max, reps: formatReps(exercise), restSeconds: mid(exercise.restSeconds) })),
        },
      };
    });

    return this.prisma.workoutPlan.create({
      data: { userId, sourceFingerprint, goal: primaryGoal, experience: trainingExperience, durationMinutes: workoutDurationMinutes, trainingLocation, trainingDays: onboarding.trainingDays, prescription: validated as unknown as Prisma.InputJsonValue, days: { create: days } },
      include: planInclude,
    });
  }
}

const planInclude = { days: { orderBy: { dayOrder: 'asc' as const }, include: { exercises: { orderBy: { exerciseOrder: 'asc' as const }, include: { exercise: true } } } } };