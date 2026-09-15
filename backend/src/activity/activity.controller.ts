import { Body, Controller, Get, Post } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CreateActivitySummaryDto } from './dto/create-activity-summary.dto';

@Controller('api/v1/activity-summaries')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list() { return this.activityService.list(); }

  @Post()
  create(@Body() payload: CreateActivitySummaryDto) { return this.activityService.create(payload); }
}
