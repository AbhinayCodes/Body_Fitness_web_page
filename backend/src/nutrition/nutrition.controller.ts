import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NutritionService } from './nutrition.service';

@Controller('api/v1/nutrition')
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('targets')
  getTargets(@CurrentUserId() userId: string) { return this.nutritionService.getTargets(userId); }
}