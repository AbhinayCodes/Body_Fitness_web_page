'use client';

import { useEffect, useState } from 'react';
import { ApiError, fitnessApi } from '@/lib/api';
import type { AppState, Profile } from '@/types/fitness';

const defaultProfile: Profile = { name: 'Rahul', goal: 'Build muscle', days: '4 days / week', diet: 'Vegetarian' };

export function useFitnessState() {
  const [state, setState] = useState<AppState>({
    view: 'dashboard', modal: null, step: 1, mealDone: false, exerciseDone: [], profile: defaultProfile,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fitnessApi.getState()
      .then((saved) => setState((current) => ({ ...current, profile: saved.profile || current.profile, mealDone: Boolean(saved.mealDone) })))
      .catch((requestError) => setError(toMessage(requestError)))
      .finally(() => setIsLoading(false));
  }, []);

  const update = (changes: Partial<AppState>) => setState((current) => ({ ...current, ...changes }));
  const updateProfile = (profile: Profile) => update({ profile });
  const logMeal = async () => {
    const previousMealDone = state.mealDone;
    update({ mealDone: true, modal: null });
    try {
      await fitnessApi.logMeal('Paneer rice bowl');
    } catch (requestError) {
      update({ mealDone: previousMealDone });
      setError(toMessage(requestError));
    }
  };
  const logWorkout = async (exercises: number[]) => {
    update({ modal: null });
    try {
      await fitnessApi.logWorkout(exercises, 52);
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  };
  const saveProfile = async () => {
    try {
      await fitnessApi.updateProfile(state.profile);
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  };

  return { state, setState, update, updateProfile, isLoading, error, clearError: () => setError(null), logMeal, logWorkout, saveProfile };
}

function toMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
