import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReplaceScheduledMealDto } from './dto/replace-scheduled-meal.dto';
import { ScheduleService } from './schedule.service';

@Controller('api/v1/schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly schedules: ScheduleService) {}
  @Get('today') getToday(@CurrentUserId() userId: string) { return this.schedules.getToday(userId); }
  @Put(':scheduleId/meals') replace(@CurrentUserId() userId: string, @Param('scheduleId') scheduleId: string, @Body() payload: ReplaceScheduledMealDto) { return this.schedules.replaceMeal(userId, scheduleId, payload.slot, payload.recipeId); }
  @Put(':scheduleId/meals/:slot/eaten') markEaten(@CurrentUserId() userId: string, @Param('scheduleId') scheduleId: string, @Param('slot') slot: string) { return this.schedules.markMealEaten(userId, scheduleId, slot); }
}