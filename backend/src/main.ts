import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpLogging, errorLocations, logEvent } from './http-logging';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false, logger: process.env.LOG_LEVEL === 'debug' ? ['error', 'warn', 'log', 'debug'] : ['error', 'warn', 'log'] });
  configureHttpLogging(app);
  app.enableCors({ origin: true, methods: ['GET', 'PUT', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'], exposedHeaders: ['X-Request-ID'] });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 8000, '0.0.0.0');
  logEvent('log', 'application.started', { port: process.env.PORT ?? 8000 });
}

process.on('uncaughtExceptionMonitor', (error, origin) => {
  logEvent('error', 'application.crashed', { origin, locations: errorLocations(error) });
});

void bootstrap().catch((error: unknown) => {
  logEvent('error', 'application.start_failed', { locations: errorLocations(error) });
  process.exit(1);
});
