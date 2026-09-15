import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({ imports: [ScheduleModule, ProgressModule], controllers: [ReminderController], providers: [ReminderService] })
export class ReminderModule {}