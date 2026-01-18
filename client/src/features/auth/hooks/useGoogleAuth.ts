import { useSignIn, useUser, useClerk } from '@clerk/clerk-react';
import { useMutation } from '@tanstack/react-query';
import { syncClerk } from '../api/sync-clerk';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { toast } from 'sonner';
import { useEffect, useRef, useCallback } from 'react';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
    message?: string;
}

interface ClerkError {
    status?: number;
    errors?: Array<{ code?: string; message?: string }>;
}

export const useGoogleAuth = () => {
    const { signIn } = useSignIn();
    const { user, isLoaded, isSignedIn } = useUser();
    const clerk = useClerk();
    const setAuth = useAuthStore((state) => state.setAuth);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const syncAttempted = useRef(false);

    const syncMutation = useMutation({
        mutationFn: syncClerk,
        onSuccess: (data) => {
            setAuth(data.user, data.token);
            toast.success('Signed in with Google successfully');
            navigate(PATHS.DASHBOARD.HOME);
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const message = error.response?.data?.message || 'Failed to sync with Google';
            toast.error(message);
            clerk.signOut();
        },
    });

    // Auto sync when Clerk user is loaded but our system is not authenticated
    useEffect(() => {
        if (isLoaded && isSignedIn && user && !isAuthenticated && !syncMutation.isPending && !syncMutation.isSuccess) {
            // Prevent double execution in StrictMode
            if (syncAttempted.current) return;

            const primaryEmail = user.primaryEmailAddress?.emailAddress;
            if (primaryEmail) {
                syncAttempted.current = true;
                syncMutation.mutate({
                    clerkId: user.id,
                    email: primaryEmail,
                    fullName: user.fullName || primaryEmail.split('@')[0],
                    avatarUrl: user.imageUrl,
                });
            }
        }
    }, [isLoaded, isSignedIn, user, isAuthenticated, syncMutation.isPending, syncMutation.isSuccess]);

    const signInWithGoogle = useCallback(async () => {
        if (!isLoaded) return;

        try {
            // Ensure clean state by signing out first if somehow signed in but not synced
            if (isSignedIn) {
                await clerk.signOut();
            }

            await signIn?.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/auth/login',
                redirectUrlComplete: '/auth/login'
            });
        } catch (err: unknown) {
            const clerkError = err as ClerkError;
            if (clerkError.status === 429 || clerkError.errors?.[0]?.code === 'rate_limit_exceeded') {
                toast.error('Too many requests. Please wait a moment before trying again.');
            } else {
                toast.error(clerkError.errors?.[0]?.message || 'Google Sign In initiation failed');
            }
        }
    }, [isLoaded, isSignedIn, clerk, signIn]);

    return {
        signInWithGoogle,
        isSyncing: syncMutation.isPending
    };
};
