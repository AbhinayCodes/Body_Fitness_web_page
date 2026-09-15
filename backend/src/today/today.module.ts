import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({ imports: [ScheduleModule, NutritionModule], controllers: [TodayController], providers: [TodayService] })
export class TodayModule {}