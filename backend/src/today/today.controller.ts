import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TodayService } from './today.service';

@Controller('api/v1/today')
@UseGuards(JwtAuthGuard)
export class TodayController {
  constructor(private readonly today: TodayService) {}
  @Get() get(@CurrentUserId() userId: string) { return this.today.get(userId); }
}