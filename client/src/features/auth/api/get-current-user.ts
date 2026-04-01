import { api } from '@/lib/axios';
import type { User } from '../types';

type CurrentUserResponse = User | { data: User };

const hasUserData = (value: CurrentUserResponse): value is { data: User } => {
  return typeof value === 'object' && value !== null && 'data' in value;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = (await api.get<CurrentUserResponse>('/users/me')) as unknown as CurrentUserResponse;
  return hasUserData(response) ? response.data : response;
};

export const getCurrentUserByAccessToken = async (accessToken: string): Promise<User> => {
  const response = (await api.get<CurrentUserResponse>('/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })) as unknown as CurrentUserResponse;

  return hasUserData(response) ? response.data : response;
};
