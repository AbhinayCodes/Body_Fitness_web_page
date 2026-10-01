const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { test } = require('node:test');
const { stripTypeScriptTypes } = require('node:module');

async function loadClient(apiUrl) {
  const storage = new Map();
  global.window = {};
  global.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  process.env.NEXT_PUBLIC_API_URL = apiUrl;
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/api.ts`, 'utf8'), { mode: 'transform' });
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${encodeURIComponent(apiUrl)}`);
}

test('all frontend API calls preserve HTTP method, path, body and bearer token', async (context) => {
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (request.url === '/api/v1/auth/send-otp') {
      response.writeHead(204).end();
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      path: request.url, method: request.method, authorization: request.headers.authorization,
      body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null,
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/v1`;
  const { fitnessApi, setAccessToken } = await loadClient(url);
  setAccessToken('test-session');
  const profile = { name: 'Test', goal: 'Build muscle', days: '3 days / week', diet: 'Vegetarian' };
  const onboarding = { age: 26, currentStep: 1, completed: false };
  const checkIn = { recordedAt: '2026-09-15', weightKg: 70 };
  const cases = [
    ['loginWithPhone', ['9876543210'], 'POST', '/auth/phone-login', { phoneNumber: '9876543210' }],
    ['verifyOtp', ['9876543210', '123456'], 'POST', '/auth/verify-otp', { phoneNumber: '9876543210', code: '123456' }],
    ['getCurrentUser', [], 'GET', '/auth/me'],
    ['getState', [], 'GET', '/state'],
    ['getWorkoutPlan', [], 'GET', '/workouts/plan'],
    ['getDailySchedule', [], 'GET', '/schedule/today'],
    ['getToday', [], 'GET', '/today'],
    ['markScheduledMealEaten', ['schedule', 'BREAKFAST'], 'PUT', '/schedule/schedule/meals/BREAKFAST/eaten'],
    ['replaceScheduledMeal', ['schedule', 'BREAKFAST', 'recipe'], 'PUT', '/schedule/schedule/meals', { slot: 'BREAKFAST', recipeId: 'recipe' }],
    ['updateWorkoutProgress', ['day', [{ exerciseIndex: 0, setsCompleted: 1 }]], 'PUT', '/workouts/today/progress', { workoutPlanDayId: 'day', exercises: [{ exerciseIndex: 0, setsCompleted: 1 }] }],
    ['getProgress', [], 'GET', '/progress'],
    ['saveCheckIn', [checkIn], 'POST', '/progress/check-ins', checkIn],
    ['saveProgressSettings', [7], 'PUT', '/progress/settings', { checkInFrequencyDays: 7 }],
    ['getReminderSettings', [], 'GET', '/reminders/settings'],
    ['saveReminderSettings', [{ mealEnabled: false }], 'PUT', '/reminders/settings', { mealEnabled: false }],
    ['getActivityToday', [], 'GET', '/activity-summaries/today'],
    ['updateProfile', [profile], 'PUT', '/profile', profile],
    ['logMeal', ['Rice'], 'POST', '/meals', { meal: 'Rice' }],
    ['logWorkout', [[0], 30], 'POST', '/workouts', { exercises: [0], durationMinutes: 30 }],
    ['getOnboarding', [], 'GET', '/onboarding'],
    ['saveOnboarding', [onboarding], 'PUT', '/onboarding', onboarding],
  ];
  for (const [name, args, method, path, body = null] of cases) {
    await context.test(name, async () => {
      assert.deepEqual(await fitnessApi[name](...args), {
        path: `/api/v1${path}`, method, body, authorization: 'Bearer test-session',
      });
    });
  }
  await context.test('sendOtp accepts a 204 response', async () => {
    assert.equal(await fitnessApi.sendOtp('9876543210'), undefined);
  });
  await context.test('normalizes a trailing slash in the configured API URL', async () => {
    const client = await loadClient(`${url}/`);
    assert.equal((await client.fitnessApi.getToday()).path, '/api/v1/today');
  });
});

test('dashboard readiness requires saved completion and schedule prerequisites', async () => {
  const { isOnboardingReady } = await loadClient('/api/v1');
  const ready = { completed: true, wakeTime: '07:00', sleepTime: '23:00', dietType: 'Vegetarian', workoutDurationMinutes: 45 };
  assert.equal(isOnboardingReady({ currentStep: 1, completed: false }), false);
  assert.equal(isOnboardingReady({ ...ready, completed: false }), false);
  assert.equal(isOnboardingReady(ready), true);
  for (const field of ['wakeTime', 'sleepTime', 'dietType', 'workoutDurationMinutes']) {
    for (const value of [undefined, null, '']) {
      assert.equal(isOnboardingReady({ ...ready, [field]: value }), false, `${field} must be saved`);
    }
  }
  assert.equal(isOnboardingReady({ ...ready, workoutDurationMinutes: 0 }), false);
});

test('API failures preserve correlation without emitting browser diagnostics', async (context) => {
  const entries = [];
  for (const level of ['debug', 'info', 'warn', 'error']) {
    context.mock.method(console, level, (message) => entries.push(JSON.parse(message)));
  }
  const { fitnessApi, setAccessToken, ApiError } = await loadClient('https://example.test/api/v1');
  setAccessToken('secret-token');
  const requestId = '12345678-1234-4234-8234-123456789abc';
  const fetchMock = context.mock.method(global, 'fetch', async (_url, options) => {
    assert.match(options.headers.get('X-Request-ID'), /^[0-9a-f-]{36}$/);
    assert.equal(options.headers.get('Authorization'), 'Bearer secret-token');
    return new Response(JSON.stringify({ message: ['secret-server-message'] }), { status: 400, headers: { 'X-Request-ID': requestId } });
  });
  await assert.rejects(fitnessApi.loginWithPhone('secret-phone'), (error) => error instanceof ApiError && error.status === 400 && error.requestId === requestId && error.message === 'secret-server-message');
  fetchMock.mock.mockImplementation(async () => { throw new Error('secret-network-message'); });
  await assert.rejects(fitnessApi.getToday(), (error) => error.status === 0 && Boolean(error.requestId));
  fetchMock.mock.mockImplementation(async () => new Response('secret-bad-json', { status: 200 }));
  await assert.rejects(fitnessApi.getToday(), (error) => error.status === 200 && error.message.includes('unreadable'));
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 204 }));
  assert.equal(await fitnessApi.sendOtp('secret-phone'), undefined);
  fetchMock.mock.mockImplementation(async () => new Response('null'));
  assert.equal(await fitnessApi.getToday(), null);
  fetchMock.mock.mockImplementation(async () => new Response('{"value":"secret-response"}'));
  await fitnessApi.markScheduledMealEaten('secret-schedule-id', 'secret-slot');
  assert.deepEqual(entries, []);
});

test('server diagnostics retain failures and safe code locations without browser access', async (context) => {
  const previousEnvironment = { ...process.env };
  const previousWindow = global.window;
  context.after(() => { process.env = previousEnvironment; global.window = previousWindow; });
  delete global.window;
  process.env.NODE_ENV = 'production';
  delete process.env.LOG_LEVEL;
  const debug = context.mock.method(console, 'debug', () => {});
  const entries = [];
  context.mock.method(console, 'error', (message) => entries.push(JSON.parse(message)));
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/diagnostics.ts`, 'utf8'), { mode: 'transform' });
  const { logDiagnostic } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  logDiagnostic('debug', 'test.debug');
  assert.equal(debug.mock.callCount(), 0);
  process.env.LOG_LEVEL = 'debug';
  logDiagnostic('debug', 'test.debug');
  assert.equal(debug.mock.callCount(), 1);
  const error = new Error('secret message');
  error.stack = 'Error: secret message\nsecret payload\n    at save (https://example.test/app.js:12:3)';
  logDiagnostic('error', 'web.request.failed', { error });
  assert.equal(entries[0].source, 'web-server');
  assert.deepEqual(entries[0].locations, ['https://example.test/app.js:12:3']);
  assert.ok(!JSON.stringify(entries).includes('secret'));
});

test('browser diagnostics remain disabled even with verbose logging enabled', async (context) => {
  const previousWindow = global.window;
  const previousEnvironment = { ...process.env };
  context.after(() => { global.window = previousWindow; process.env = previousEnvironment; });
  global.window = {};
  const entries = [];
  for (const level of ['debug', 'info', 'warn', 'error']) {
    context.mock.method(console, level, (message) => entries.push(message));
  }
  const diagnostics = stripTypeScriptTypes(readFileSync(`${__dirname}/diagnostics.ts`, 'utf8'), { mode: 'transform' });
  const diagnosticsUrl = `data:text/javascript;base64,${Buffer.from(diagnostics).toString('base64')}`;
  const { logDiagnostic } = await import(diagnosticsUrl);
  process.env.LOG_LEVEL = 'debug';
  process.env.NEXT_PUBLIC_LOG_LEVEL = 'debug';
  for (const environment of ['development', 'production']) {
    process.env.NODE_ENV = environment;
    for (const level of ['debug', 'info', 'warn', 'error']) {
      logDiagnostic(level, 'private.event', { error: new Error('private details') });
    }
  }
  assert.deepEqual(entries, []);
});