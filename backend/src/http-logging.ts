import { BadRequestException, Catch, HttpException, Logger, ValidationPipe } from '@nestjs/common';
import type { ArgumentsHost, CallHandler, ExecutionContext, INestApplication, NestInterceptor, ValidationError } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tap } from 'rxjs';

type LoggedRequest = IncomingMessage & { requestId?: string; operation?: string; body?: unknown; route?: { path?: string } };
const logger = new Logger('Diagnostics');

export function logEvent(level: 'log' | 'warn' | 'error' | 'debug', event: string, details: Record<string, unknown> = {}) {
  logger[level](JSON.stringify({ timestamp: new Date().toISOString(), source: 'api', event, ...details }));
}

export function errorLocations(error: unknown): string[] {
  if (!(error instanceof Error)) return [];
  return (error.stack ?? '').split('\n').slice(1)
    .filter((line) => /^\s+at /.test(line))
    .flatMap((line) => line.match(/(?:file:\/\/\/|[A-Za-z]:[\\/]|\/)[^()\n]*\.(?:[cm]?js|tsx?):\d+:\d+(?=\)?$)/)?.[0] ?? [])
    .slice(0, 10);
}

function requestDetails(request: LoggedRequest) {
  return {
    requestId: request.requestId,
    operation: request.operation,
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(request.method ?? '') ? request.method : 'OTHER',
    route: request.route?.path ?? '<unmatched>',
  };
}

function validationIssues(errors: ValidationError[], parent = ''): Array<{ field: string; rules: string[] }> {
  return errors.flatMap((error) => {
    const property = error.constraints?.whitelistValidation ? '<unknown>' : error.property;
    const field = parent ? `${parent}.${property}` : property;
    return [
      ...(error.constraints ? [{ field, rules: Object.keys(error.constraints) }] : []),
      ...validationIssues(error.children ?? [], field),
    ];
  });
}

class HandlerLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<LoggedRequest>();
    request.operation = `${context.getClass().name}.${context.getHandler().name}`;
    const started = performance.now();
    logEvent('debug', 'handler.started', { ...requestDetails(request), hasBody: request.body != null });
    return next.handle().pipe(tap((result: unknown) => {
      logEvent('debug', 'handler.completed', {
        ...requestDetails(request), durationMs: Math.round(performance.now() - started),
        responseType: result === null ? 'null' : Array.isArray(result) ? 'array' : typeof result,
      });
    }));
  }
}

class LoggedValidationException extends BadRequestException {
  readonly issues: ReturnType<typeof validationIssues>;

  constructor(errors: ValidationError[]) {
    const exception: unknown = new ValidationPipe().createExceptionFactory()(errors);
    super(exception instanceof HttpException ? exception.getResponse() : undefined);
    this.issues = validationIssues(errors).slice(0, 50);
  }
}

@Catch()
class LoggingExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<LoggedRequest>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    logEvent(status >= 500 ? 'error' : 'warn', 'request.failed', {
      ...requestDetails(request), status,
      ...(exception instanceof LoggedValidationException ? { validation: exception.issues } : {}),
      ...(status >= 500 ? { locations: errorLocations(exception) } : {}),
    });
    if (!(exception instanceof HttpException)) {
      super.catch(new HttpException('Internal server error', 500), host);
      return;
    }
    super.catch(exception, host);
  }
}

export function configureHttpLogging(app: INestApplication) {
  app.use((request: LoggedRequest, response: ServerResponse, next: () => void) => {
    const suppliedId = request.headers['x-request-id'];
    request.requestId = typeof suppliedId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId)
      ? suppliedId : randomUUID();
    response.setHeader('X-Request-ID', request.requestId);
    const started = performance.now();
    logEvent('debug', 'request.started', requestDetails(request));
    response.once('finish', () => {
      logEvent('log', 'request.completed', { ...requestDetails(request), status: response.statusCode, durationMs: Math.round(performance.now() - started) });
    });
    response.once('close', () => {
      if (!response.writableFinished) logEvent('warn', 'request.aborted', { ...requestDetails(request), durationMs: Math.round(performance.now() - started) });
    });
    next();
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    exceptionFactory: (errors) => new LoggedValidationException(errors),
  }));
  app.useGlobalFilters(new LoggingExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
  app.useGlobalInterceptors(new HandlerLoggingInterceptor());
}