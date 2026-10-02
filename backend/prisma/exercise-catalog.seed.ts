import { PrismaClient } from '@prisma/client';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from '../src/workout/exercise-library';

// Persistence only — the catalog data lives in src/workout/exercise-library.ts so it can be shared
// with the workout engine and its validation tests.
export async function seedExerciseCatalog(prisma: PrismaClient): Promise<void> {
  for (const exercise of exerciseLibrary) await prisma.exercise.upsert({ where: { slug: exercise.slug }, update: exercise, create: exercise });

  const slugs = exerciseLibrary.map((exercise) => exercise.slug);
  const records = await prisma.exercise.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const idBySlug = new Map(records.map((record) => [record.slug, record.id]));
  const exerciseIds = [...idBySlug.values()];

  // Rebuild relationships and constraints idempotently for the seeded set.
  await prisma.exerciseRelation.deleteMany({ where: { fromExerciseId: { in: exerciseIds } } });
  await prisma.exerciseConstraint.deleteMany({ where: { exerciseId: { in: exerciseIds } } });

  const relationData = exerciseRelations.flatMap((relation) => {
    const fromExerciseId = idBySlug.get(relation.from);
    const toExerciseId = idBySlug.get(relation.to);
    return fromExerciseId && toExerciseId ? [{ fromExerciseId, toExerciseId, relationType: relation.relationType, note: relation.note ?? null }] : [];
  });
  if (relationData.length) await prisma.exerciseRelation.createMany({ data: relationData, skipDuplicates: true });

  const constraintData = exerciseConstraints.flatMap((constraint) => {
    const exerciseId = idBySlug.get(constraint.slug);
    return exerciseId ? [{ exerciseId, constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity, note: constraint.note ?? null }] : [];
  });
  if (constraintData.length) await prisma.exerciseConstraint.createMany({ data: constraintData });
}
