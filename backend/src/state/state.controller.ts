import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StateService } from './state.service';

@Controller(['api/v1/state', 'api/state'])
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getState(@CurrentUserId() userId: string) {
    return this.stateService.getState(userId);
  }
}
