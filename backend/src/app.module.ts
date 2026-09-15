import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/env.validation';
import { DataAccessModule } from './data-access/data-access.module';
import { MealModule } from './meal/meal.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProfileModule } from './profile/profile.module';
import { RecipeModule } from './recipe/recipe.module';
import { ProgressModule } from './progress/progress.module';
import { StateModule } from './state/state.module';
import { ScheduleModule } from './schedule/schedule.module';
import { WorkoutModule } from './workout/workout.module';
import { TodayModule } from './today/today.module';
import { ReminderModule } from './reminder/reminder.module';

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
		NutritionModule,
		RecipeModule,
		ProgressModule,
		ScheduleModule,
		TodayModule,
		ReminderModule,
	],
})
export class AppModule {}
