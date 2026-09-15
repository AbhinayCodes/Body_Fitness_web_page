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