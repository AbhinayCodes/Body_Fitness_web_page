import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('api/v1/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUserId() userId: string) { return this.onboardingService.get(userId); }

  @Put()
  @UseGuards(JwtAuthGuard)
  save(@CurrentUserId() userId: string, @Body() payload: SaveOnboardingDto) { return this.onboardingService.save(userId, payload); }
}
