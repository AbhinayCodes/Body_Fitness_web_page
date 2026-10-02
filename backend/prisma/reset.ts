import { PrismaClient } from '@prisma/client';
import { seedExerciseCatalog } from './exercise-catalog.seed';
import { seedRecipeCatalog } from './recipe-catalog.seed';

// One-off reset: remove ALL user-scoped data (users cascade to profiles, onboarding, plans,
// schedules, progress, reminders, activity, meal logs) plus OTP challenges, then re-seed the
// exercise and recipe catalogs. Catalog tables (Exercise/Recipe) are not user data and are kept.
const prisma = new PrismaClient();

async function main() {
  const otp = await prisma.otpChallenge.deleteMany({});
  const users = await prisma.user.deleteMany({});
  console.log(`Deleted ${users.count} users (cascaded all user data) and ${otp.count} OTP challenges.`);
  await seedExerciseCatalog(prisma);
  await seedRecipeCatalog(prisma);
  console.log('Re-seeded exercise and recipe catalogs.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
