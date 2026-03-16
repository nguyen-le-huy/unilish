import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { User } from '@/features/auth/types';
import type { ApiErrorResponse } from '@/types/common';
import {
    updateOnboardingProfile,
    type UpdateOnboardingProfilePayload,
} from '../api/update-onboarding-profile';

export const useUpdateOnboardingProfile = () => {
    return useMutation<User, AxiosError<ApiErrorResponse>, UpdateOnboardingProfilePayload>({
        mutationFn: updateOnboardingProfile,
    });
};
