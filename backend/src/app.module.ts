import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/env.validation';
import { DataAccessModule } from './data-access/data-access.module';
import { MealModule } from './meal/meal.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProfileModule } from './profile/profile.module';
import { StateModule } from './state/state.module';
import { WorkoutModule } from './workout/workout.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
		AuthModule,
		DataAccessModule,
		OnboardingModule,
		ActivityModule,
		StateModule,
		ProfileModule,
		WorkoutModule,
		MealModule,
	],
})
export class AppModule {}
