import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { getCurrentUser } from '../api/get-current-user';
import type { User } from '../types';

const pickNonEmpty = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

export const useSyncAuthUser = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  // Do not call /users/me when only persisted user exists but token has not
  // been restored yet after reload. That case can cause a false 401 and logout.
  const hasAuthCredentials = isAuthenticated && Boolean(token);

  const query = useQuery<User, AxiosError>({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    enabled: hasAuthCredentials,
    staleTime: 2 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      const mergedUser: User = {
        ...query.data,
        // Preserve backend ObjectId fields
        learningLanguageId: query.data.learningLanguageId,
        learningGoalId: query.data.learningGoalId,
        // Merge with client-side fields for backward compatibility
        nativeLanguage: pickNonEmpty(query.data.nativeLanguage, user?.nativeLanguage),
        learningGoal: pickNonEmpty(query.data.learningGoal, user?.learningGoal),
        currentLevel: query.data.currentLevel ?? user?.currentLevel,
        placementTestScore: query.data.placementTestScore ?? user?.placementTestScore,
      };

      setUser(mergedUser);
    }
  }, [query.data, query.isSuccess, setUser, user?.currentLevel, user?.learningGoal, user?.nativeLanguage, user?.placementTestScore]);

  useEffect(() => {
    if (query.isError && query.error.response?.status === 401) {
      logout();
    }
  }, [logout, query.error, query.isError]);

  return query;
};
