import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CreateExercisePerformanceDto } from './dto/create-exercise-performance.dto';
import { UpdateProgressSettingsDto } from './dto/update-progress-settings.dto';
import { ProgressService } from './progress.service';

@Controller('api/v1/progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}
  @Get() get(@CurrentUserId() userId: string) { return this.progress.getSummary(userId); }
  @Post('check-ins') checkIn(@CurrentUserId() userId: string, @Body() payload: CreateCheckInDto) { return this.progress.createCheckIn(userId, payload); }
  @Put('settings') settings(@CurrentUserId() userId: string, @Body() payload: UpdateProgressSettingsDto) { return this.progress.updateSettings(userId, payload); }
  @Post('performances') performance(@CurrentUserId() userId: string, @Body() payload: CreateExercisePerformanceDto) { return this.progress.logPerformance(userId, payload); }
}