import { useUser } from '@clerk/clerk-react';
import { useEffect, useRef } from 'react';
import { syncClerkUser } from '../api/auth-api';
import { notify } from '@/lib/notification';

// Local storage key for storing backend user data
const USER_STORAGE_KEY = 'unilish_user';
const TOKEN_STORAGE_KEY = 'unilish_token';

export interface UnilishUser {
    _id: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    role: string;
    currentLevel: string;
    stats: {
        xp: number;
        coins: number;
        streak: number;
        longestStreak: number;
        lastActiveAt: string;
    };
    subscription: {
        plan: string;
        status: string;
    };
}

/**
 * Hook to sync Clerk user with MongoDB backend
 * Automatically called when user signs in via Clerk
 * Stores backend user data and JWT token in localStorage
 */
export const useAuthSync = () => {
    const { user, isSignedIn, isLoaded } = useUser();
    const hasSynced = useRef(false);

    useEffect(() => {
        const syncUserToBackend = async () => {
            if (!isLoaded || !isSignedIn || !user || hasSynced.current) {
                return;
            }

            try {
                hasSynced.current = true;

                const response = await syncClerkUser({
                    clerkId: user.id,
                    email: user.primaryEmailAddress?.emailAddress || '',
                    fullName: user.fullName || user.firstName || '',
                    avatarUrl: user.imageUrl,
                });

                // Store user data and token in localStorage
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
                localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);

                // Show success notification only for new users (first time login)
                const existingUser = localStorage.getItem('unilish_synced');
                if (!existingUser) {
                    notify.auth.loginSuccess();
                    localStorage.setItem('unilish_synced', 'true');
                }
            } catch (error) {
                console.error('Failed to sync user with backend:', error);
                hasSynced.current = false; // Allow retry on error
                // Don't show error toast - user can still use the app
            }
        };

        syncUserToBackend();
    }, [isLoaded, isSignedIn, user]);

    return {
        isLoaded,
        isSignedIn,
        clerkUser: user,
    };
};

/**
 * Get stored backend user data from localStorage
 */
export const getStoredUser = (): UnilishUser | null => {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    if (!userData) return null;

    try {
        return JSON.parse(userData) as UnilishUser;
    } catch {
        return null;
    }
};

/**
 * Get stored JWT token from localStorage
 */
export const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Clear stored user data (on logout)
 */
export const clearStoredAuth = (): void => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('unilish_synced');
};
