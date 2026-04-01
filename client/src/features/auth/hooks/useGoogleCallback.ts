import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { getCurrentUserByAccessToken } from '../api/get-current-user';
import { getPostAuthRedirectPath } from '../utils/onboarding';
import type { User } from '../types';

interface GoogleCallbackPayload {
    user: User;
    accessToken: string;
    isNewUser: boolean;
}

const parseGoogleCallbackFragment = (): { accessToken: string; isNewUser: boolean } => {
    const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;

    const params = new URLSearchParams(rawHash);
    const accessToken = params.get('accessToken');

    if (!accessToken) {
        throw new Error('Missing access token from Google callback');
    }

    const isNewUserRaw = params.get('isNewUser');
    const isNewUser = isNewUserRaw === '1' || isNewUserRaw === 'true';

    return { accessToken, isNewUser };
};

export const useGoogleCallback = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    const { data, error, isSuccess, isError } = useQuery({
        queryKey: ['auth', 'google-callback'],
        queryFn: async (): Promise<GoogleCallbackPayload> => {
            // Temporarily clear any stale token
            useAuthStore.getState().logout();

            const { accessToken, isNewUser } = parseGoogleCallbackFragment();

            // Remove fragment immediately to avoid token leak in browser history.
            window.history.replaceState(null, '', window.location.pathname + window.location.search);

            const user = await getCurrentUserByAccessToken(accessToken);
            return { user, accessToken, isNewUser };
        },
        retry: false, // Don't retry on failure
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: false, // Only fetch once
        staleTime: Infinity, // Data is always fresh (one-time operation)
    });

    // Handle success
    useEffect(() => {
        if (isSuccess && data) {
            setAuth(data.user, data.accessToken);
            toast.success('Successfully logged in with Google');
            navigate(data.isNewUser ? getPostAuthRedirectPath(data.user) : PATHS.DASHBOARD.HOME);
        }
    }, [isSuccess, data, setAuth, navigate]);

    // Handle error
    useEffect(() => {
        if (isError) {
            toast.error('Authentication failed. Please try again.');
            navigate(PATHS.AUTH.LOGIN);
        }
    }, [isError, error, navigate]);

    return { data, error, isSuccess, isError };
};
