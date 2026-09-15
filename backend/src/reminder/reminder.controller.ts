import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateReminderSettingsDto } from './dto/update-reminder-settings.dto';
import { ReminderService } from './reminder.service';

@Controller('api/v1/reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}
  @Get('settings') settings(@CurrentUserId() userId: string) { return this.reminders.getSettings(userId); }
  @Put('settings') update(@CurrentUserId() userId: string, @Body() payload: UpdateReminderSettingsDto) { return this.reminders.updateSettings(userId, payload); }
  @Get('today') today(@CurrentUserId() userId: string) { return this.reminders.getToday(userId); }
}