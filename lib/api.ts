import type { ActivityToday, DailySchedule, FitnessState, GeneratedWorkoutPlan, OnboardingData, Profile, ProgressSummary, ReminderSettings, TodayExperience } from '@/types/fitness';

const BACKEND_API_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (BACKEND_API_URL ? `${BACKEND_API_URL}/api/v1` : '/api/v1');
const ACCESS_TOKEN_KEY = 'formwell.accessToken';
const DEMO_PHONE_KEY = 'formwell.demoPhone';
const DEMO_ONBOARDING_KEY = 'formwell.demoOnboarding';

export function setAccessToken(token: string) { sessionStorage.setItem(ACCESS_TOKEN_KEY, token); }
export function clearAccessToken() { sessionStorage.removeItem(ACCESS_TOKEN_KEY); }
export function setDemoPhone(phoneNumber: string) { sessionStorage.setItem(DEMO_PHONE_KEY, phoneNumber); }
export function isDemoLogin() { return typeof window !== 'undefined' && Boolean(sessionStorage.getItem(DEMO_PHONE_KEY)); }
export function clearDemoLogin() { sessionStorage.removeItem(DEMO_PHONE_KEY); }
export function getDemoOnboarding<T>(): T | null {
  const saved = sessionStorage.getItem(DEMO_ONBOARDING_KEY);
  if (!saved) return null;
  try { return JSON.parse(saved) as T; } catch { return null; }
}
export function saveDemoOnboarding<T>(onboarding: T) { sessionStorage.setItem(DEMO_ONBOARDING_KEY, JSON.stringify(onboarding)); }
export function clearDemoOnboarding() { sessionStorage.removeItem(DEMO_ONBOARDING_KEY); }

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && sessionStorage.getItem(ACCESS_TOKEN_KEY) ? { Authorization: `Bearer ${sessionStorage.getItem(ACCESS_TOKEN_KEY)}` } : {}), ...(options?.headers ?? {}) },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to Formwell. Please try again.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    if (response.status === 404 && API_URL === '/api/v1') {
      throw new ApiError(response.status, 'API endpoint not found. Start the backend server and set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1 or BACKEND_API_URL=http://127.0.0.1:8000.');
    }
    throw new ApiError(response.status, message ?? `Request failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export const fitnessApi = {
  loginWithPhone: (phoneNumber: string) => request<AuthResult>('/auth/phone-login', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  sendOtp: (phoneNumber: string) => request<void>('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  verifyOtp: (phoneNumber: string, code: string) => request<AuthResult>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phoneNumber, code }) }),
  getCurrentUser: () => request<CurrentUser>('/auth/me'),
  getState: () => request<FitnessState>('/state'),
  getWorkoutPlan: () => request<GeneratedWorkoutPlan>('/workouts/plan'),
  getDailySchedule: () => request<DailySchedule>('/schedule/today'),
  getToday: () => request<TodayExperience>('/today'),
  markScheduledMealEaten: (scheduleId: string, slot: string) => request(`/schedule/${scheduleId}/meals/${slot}/eaten`, { method: 'PUT' }),
  replaceScheduledMeal: (scheduleId: string, slot: string, recipeId: string) => request(`/schedule/${scheduleId}/meals`, { method: 'PUT', body: JSON.stringify({ slot, recipeId }) }),
  updateWorkoutProgress: (workoutPlanDayId: string, exercises: Array<{ exerciseIndex: number; setsCompleted: number }>) => request('/workouts/today/progress', { method: 'PUT', body: JSON.stringify({ workoutPlanDayId, exercises }) }),
  getProgress: () => request<ProgressSummary>('/progress'),
  saveCheckIn: (payload: { recordedAt: string; weightKg: number; measurements?: Array<{ type: string; valueCm: number }> }) => request('/progress/check-ins', { method: 'POST', body: JSON.stringify(payload) }),
  saveProgressSettings: (checkInFrequencyDays: 7 | 14) => request('/progress/settings', { method: 'PUT', body: JSON.stringify({ checkInFrequencyDays }) }),
  getReminderSettings: () => request<ReminderSettings>('/reminders/settings'),
  saveReminderSettings: (settings: Partial<ReminderSettings>) => request<ReminderSettings>('/reminders/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getActivityToday: () => request<ActivityToday>('/activity-summaries/today'),
  updateProfile: (profile: Profile) => request<Profile>('/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  logMeal: (meal: string) => request('/meals', { method: 'POST', body: JSON.stringify({ meal }) }),
  logWorkout: (exercises: number[], durationMinutes: number) => request('/workouts', {
    method: 'POST',
    body: JSON.stringify({ exercises, durationMinutes }),
  }),
  getOnboarding: () => request<OnboardingData>('/onboarding'),
  saveOnboarding: (onboarding: OnboardingData) => request<OnboardingData>('/onboarding', { method: 'PUT', body: JSON.stringify(onboarding) }),
};

export interface AuthUser { id: string; phoneNumber: string; }
export interface AuthResult { accessToken: string; isNewUser: boolean; user: AuthUser; }
export interface CurrentUser { user: AuthUser; }
