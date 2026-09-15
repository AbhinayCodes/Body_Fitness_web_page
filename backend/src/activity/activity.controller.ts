import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityService } from './activity.service';
import { CreateActivitySummaryDto } from './dto/create-activity-summary.dto';
import { ListActivityHistoryDto } from './dto/list-activity-history.dto';
import { UpdateActivitySettingsDto } from './dto/update-activity-settings.dto';

@Controller('api/v1/activity-summaries')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUserId() userId: string) { return this.activityService.list(userId); }

  @Get('today')
  @UseGuards(JwtAuthGuard)
  today(@CurrentUserId() userId: string) { return this.activityService.getToday(userId); }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(@CurrentUserId() userId: string, @Query() query: ListActivityHistoryDto) { return this.activityService.history(userId, query); }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUserId() userId: string, @Body() payload: CreateActivitySummaryDto) { return this.activityService.create(userId, payload); }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  settings(@CurrentUserId() userId: string, @Body() payload: UpdateActivitySettingsDto) { return this.activityService.updateSettings(userId, payload); }
}
