import { Controller, Get } from '@nestjs/common';

// Public, unauthenticated, no database access. Used for uptime/keep-warm pings and Render health
// checks so the free-tier service does not cold-start between visitors.
@Controller(['api/v1/health', 'api/health'])
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
