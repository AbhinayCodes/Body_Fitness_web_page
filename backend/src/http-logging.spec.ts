import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Body, Controller, Get, INestApplication, Logger, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, MinLength } from 'class-validator';
import { configureHttpLogging, errorLocations } from './http-logging';

class TestPayload {
  @IsString()
  @MinLength(3)
  name!: string;
}

@Controller('diagnostics')
class TestController {
  @Post()
  save(@Body() payload: TestPayload) { return payload; }

  @Get('crash/:id')
  crash(@Param('id') id: string) { throw new Error(`secret database value ${id}`); }

  @Get('protected')
  protectedRoute() { throw new UnauthorizedException(); }
}

describe('HTTP diagnostics', () => {
  let app: INestApplication | undefined;
  afterEach(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  it('correlates requests and logs validation and crashes without sensitive values', async () => {
    const entries: string[] = [];
    for (const level of ['log', 'warn', 'error', 'debug'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => { entries.push(String(message)); });
    }
    const module = await Test.createTestingModule({ controllers: [TestController] }).compile();
    app = module.createNestApplication();
    configureHttpLogging(app);
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const requestId = '12345678-1234-4234-8234-123456789abc';
    const success = await fetch(`${url}/diagnostics`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, Authorization: 'Bearer secret-token' }, body: JSON.stringify({ name: 'secret-name' }) });
    expect(success.status).toBe(201);
    expect(success.headers.get('x-request-id')).toBe(requestId);
    expect(await success.json()).toEqual({ name: 'secret-name' });
    const invalid = await fetch(`${url}/diagnostics`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'secret-invalid-id' }, body: JSON.stringify({ 'secret-unknown-field': 'secret-value' }) });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect((await invalid.json()).message).toContain('name must be a string');
    const crash = await fetch(`${url}/diagnostics/crash/secret-record?token=secret-query`);
    expect(crash.status).toBe(500);
    expect(await crash.json()).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect((await fetch(`${url}/diagnostics/protected`)).status).toBe(401);
    expect((await fetch(`${url}/secret-unknown-route`)).status).toBe(404);
    const malformed = await fetch(`${url}/diagnostics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"secret-invalid-json"' });
    expect(malformed.status).toBe(400);
    const logs = entries.filter((entry) => entry.startsWith('{')).map((entry) => JSON.parse(entry));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'request.completed', requestId, route: '/diagnostics', status: 201, durationMs: expect.any(Number) }));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'handler.started', requestId, operation: 'TestController.save', hasBody: true }));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'handler.completed', requestId, operation: 'TestController.save', responseType: 'object' }));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'request.failed', status: 400, validation: expect.arrayContaining([expect.objectContaining({ field: 'name', rules: expect.arrayContaining(['isString']) })]) }));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'request.failed', status: 500, route: '/diagnostics/crash/:id', locations: expect.any(Array) }));
    expect(entries.join('\n')).not.toContain('secret-');
    expect(entries.join('\n')).not.toContain('secret database value');
  });

  it('keeps source locations but excludes multiline error messages', () => {
    const error = new Error('secret');
    error.stack = 'Error: secret\nsecret payload\n    at save (D:\\app\\service.ts:10:2)\n    at run (/app/main.js:20:4)';
    expect(errorLocations(error)).toEqual(['D:\\app\\service.ts:10:2', '/app/main.js:20:4']);
    expect(errorLocations(null)).toEqual([]);
  });
});