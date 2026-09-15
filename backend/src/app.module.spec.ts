import { expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PrismaService } from './data-access/prisma.service';
import { OnboardingService } from './onboarding/onboarding.service';

it('resolves the complete application dependency graph without connecting to a database', async () => {
  const previousEnvironment = { ...process.env };
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/formwell_test';
  process.env.JWT_SECRET = 'test-only-secret-for-module-resolution-123456';
  process.env.OTP_DEVELOPMENT_MODE = 'false';
  try {
    const { AppModule } = await import('./app.module.js');
    const application = await Test.createTestingModule({ imports: [AppModule] }).compile();
    try {
      expect(application.get(PrismaService)).toBeDefined();
      expect(application.get(OnboardingService)).toBeDefined();
    } finally {
      await application.close();
    }
  } finally {
    process.env = previousEnvironment;
  }
});