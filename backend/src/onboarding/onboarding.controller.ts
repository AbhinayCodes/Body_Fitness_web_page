import { Body, Controller, Get, Put } from '@nestjs/common';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('api/v1/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  get() { return this.onboardingService.get(); }

  @Put()
  save(@Body() payload: SaveOnboardingDto) { return this.onboardingService.save(payload); }
}
