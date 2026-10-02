import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { WorkoutPrescriptionService } from './workout-prescription.service';
import { validateWorkout, type ValidatedWorkout } from './workout-validation';

export interface ValidatedPrescription extends ValidatedWorkout {
  requiresMedicalClearance: boolean;
  safetyNotices: string[];
}

// Reusable service: validates a user's prescribed workout for realistic volume/time and adjusts it
// by priority where needed. It does not select exercises, change the database, or relax safety.
@Injectable()
export class WorkoutValidationService {
  constructor(private readonly prisma: PrismaService, private readonly prescriptions: WorkoutPrescriptionService) {}

  async generate(userId: string): Promise<ValidatedPrescription> {
    const prescription = await this.prescriptions.generate(userId);
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.workoutDurationMinutes) throw new BadRequestException('Complete your workout duration before validating a workout.');
    const validated = validateWorkout(prescription, { workoutDurationMinutes: onboarding.workoutDurationMinutes, requiresGentle: prescription.requiresMedicalClearance });
    return { ...validated, requiresMedicalClearance: prescription.requiresMedicalClearance, safetyNotices: prescription.safetyNotices };
  }
}
