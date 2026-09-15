import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { seedRecipeCatalog } from './recipe-catalog.seed';
import { seedExerciseCatalog } from './exercise-catalog.seed';

type PrototypeState = {
  profile?: { name?: string; goal?: string; days?: string; diet?: string };
  mealDone?: boolean;
  workoutHistory?: Array<{ date: string; exercises: number[]; durationMinutes: number }>;
  mealHistory?: Array<{ date: string; meal: string }>;
};

const prisma = new PrismaClient();

async function main() {
  const source = await readFile(join(process.cwd(), '..', 'data.json'), 'utf8');
  const state = JSON.parse(source.replace(/^\uFEFF/, '')) as PrototypeState;
  const user = await prisma.user.upsert({
    where: { key: 'prototype-user' },
    update: { mealDone: Boolean(state.mealDone) },
    create: { key: 'prototype-user', mealDone: Boolean(state.mealDone) },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      name: state.profile?.name ?? 'Rahul', goal: state.profile?.goal ?? 'Build muscle',
      days: state.profile?.days ?? '4 days / week', diet: state.profile?.diet ?? 'Vegetarian',
    },
    create: {
      userId: user.id, name: state.profile?.name ?? 'Rahul', goal: state.profile?.goal ?? 'Build muscle',
      days: state.profile?.days ?? '4 days / week', diet: state.profile?.diet ?? 'Vegetarian',
    },
  });

  await prisma.exerciseCompletion.deleteMany({ where: { workoutSession: { userId: user.id } } });
  await prisma.workoutSession.deleteMany({ where: { userId: user.id } });
  await prisma.mealLog.deleteMany({ where: { userId: user.id } });

  for (const workout of state.workoutHistory ?? []) {
    await prisma.workoutSession.create({ data: {
      userId: user.id, date: new Date(`${workout.date}T00:00:00.000Z`), durationMinutes: workout.durationMinutes,
      exercises: { create: workout.exercises.map((exerciseIndex) => ({ exerciseIndex })) },
    } });
  }
  for (const meal of state.mealHistory ?? []) {
    await prisma.mealLog.create({ data: { userId: user.id, date: new Date(`${meal.date}T00:00:00.000Z`), meal: meal.meal } });
  }
  await seedRecipeCatalog(prisma);
  await seedExerciseCatalog(prisma);
}

main().finally(() => prisma.$disconnect());
