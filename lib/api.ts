import type { FitnessState, OnboardingData, Profile } from '@/types/fitness';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

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
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to Formwell. Please try again.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    throw new ApiError(response.status, message ?? `Request failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export const fitnessApi = {
  getState: () => request<FitnessState>('/state'),
  updateProfile: (profile: Profile) => request<Profile>('/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  logMeal: (meal: string) => request('/meals', { method: 'POST', body: JSON.stringify({ meal }) }),
  logWorkout: (exercises: number[], durationMinutes: number) => request('/workouts', {
    method: 'POST',
    body: JSON.stringify({ exercises, durationMinutes }),
  }),
  getOnboarding: () => request<OnboardingData>('/onboarding'),
  saveOnboarding: (onboarding: OnboardingData) => request<OnboardingData>('/onboarding', { method: 'PUT', body: JSON.stringify(onboarding) }),
};
