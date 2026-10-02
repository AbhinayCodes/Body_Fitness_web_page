import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { contextFromOnboarding } from './onboarding-context';
import { getExerciseCandidates, type CandidateQuery, type CandidateResult, type RelationEdge } from './exercise-candidates';
import type { CatalogExercise } from './workout-planner.types';

// Reusable service: resolves a user's onboarding profile into a structured exercise-candidate pool.
// It does not generate a workout.
@Injectable()
export class ExerciseCandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidates(userId: string): Promise<CandidateResult> {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.completed) throw new BadRequestException('Complete onboarding before requesting exercise candidates.');
    if (!onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.trainingLocation) throw new BadRequestException('Your training profile is incomplete.');

    const [exercises, relationRows, performed] = await Promise.all([
      this.prisma.exercise.findMany({ include: { constraints: true } }),
      this.prisma.exerciseRelation.findMany({ select: { fromExerciseId: true, toExerciseId: true, relationType: true } }),
      this.prisma.exercisePerformance.findMany({ where: { userId }, distinct: ['exerciseId'], select: { exercise: { select: { slug: true } } } }),
    ]);

    const slugById = new Map(exercises.map((exercise) => [exercise.id, exercise.slug]));
    const relations: RelationEdge[] = relationRows.flatMap((row) => {
      const from = slugById.get(row.fromExerciseId);
      const to = slugById.get(row.toExerciseId);
      return from && to ? [{ from, to, relationType: row.relationType }] : [];
    });

    const query: CandidateQuery = {
      primaryGoal: onboarding.primaryGoal as CandidateQuery['primaryGoal'],
      trainingExperience: onboarding.trainingExperience as CandidateQuery['trainingExperience'],
      trainingLocation: onboarding.trainingLocation as CandidateQuery['trainingLocation'],
      history: performed.map((performance) => performance.exercise.slug),
      ...contextFromOnboarding(onboarding),
    };
    return getExerciseCandidates(exercises as unknown as CatalogExercise[], relations, query);
  }
}
