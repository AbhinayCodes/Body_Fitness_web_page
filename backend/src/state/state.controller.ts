import { Controller, Get } from '@nestjs/common';
import { StateService } from './state.service';

@Controller(['api/v1/state', 'api/state'])
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  getState() {
    return this.stateService.getState();
  }
}
