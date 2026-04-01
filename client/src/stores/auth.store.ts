import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/features/auth/types';
import { useOnboardingDraftStore } from './onboarding.store';

interface AuthState {
    user: User | null;
    token: string | null;        // accessToken (alias kept for backward compat)
    refreshToken: string | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;
    setAuth: (user: User, accessToken: string | null, refreshToken?: string | null) => void;
    setUser: (user: User) => void;
    setHasHydrated: (value: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            hasHydrated: false,
            setAuth: (user, accessToken, refreshToken = null) => {
                set({ user, token: accessToken, refreshToken, isAuthenticated: true });
            },
            setUser: (user) => {
                set((state) => ({ ...state, user }));
            },
            setHasHydrated: (value) => {
                set((state) => ({ ...state, hasHydrated: value }));
            },
            logout: () => {
                useOnboardingDraftStore.getState().clear();
                set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
            },
        }),
        {
            name: 'unilish-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                user: state.user, 
                isAuthenticated: state.isAuthenticated 
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
