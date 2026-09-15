import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, methods: ['GET', 'PUT', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(process.env.PORT ?? 8000, '127.0.0.1');
}

void bootstrap();
