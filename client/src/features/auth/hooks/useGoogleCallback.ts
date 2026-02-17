import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type { User } from '../types';
import { useEffect } from 'react';

interface UserResponse {
    data: User;
}

export const useGoogleCallback = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    const { data, error, isSuccess, isError } = useQuery({
        queryKey: ['auth', 'google-callback'],
        queryFn: async () => {
            // Temporarily clear any stale token
            useAuthStore.getState().logout();

            // Fetch user profile using session cookie
            const response = await api.get<UserResponse>('/users/me');
            return (response as any).data as User;
        },
        retry: false, // Don't retry on failure
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: false, // Only fetch once
        staleTime: Infinity, // Data is always fresh (one-time operation)
    });

    // Handle success
    useEffect(() => {
        if (isSuccess && data) {
            setAuth(data, 'cookie'); // Use 'cookie' as placeholder token
            toast.success('Successfully logged in with Google');
            navigate(PATHS.DASHBOARD.HOME);
        }
    }, [isSuccess, data, setAuth, navigate]);

    // Handle error
    useEffect(() => {
        if (isError) {
            console.error('Auth check failed', error);
            toast.error('Authentication failed. Please try again.');
            navigate(PATHS.AUTH.LOGIN);
        }
    }, [isError, error, navigate]);

    return { data, error, isSuccess, isError };
};
