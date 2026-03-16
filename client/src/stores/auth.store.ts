import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/features/auth/types';
import { useOnboardingDraftStore } from './onboarding.store';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string | null) => void;
    setUser: (user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => {
                set({ user, token, isAuthenticated: true });
            },
            setUser: (user) => {
                set((state) => ({ ...state, user }));
            },
            logout: () => {
                useOnboardingDraftStore.getState().clear();
                set({ user: null, token: null, isAuthenticated: false });
            },
        }),
        {
            name: 'unilish-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                user: state.user, 
                token: state.token, 
                isAuthenticated: state.isAuthenticated 
            }),
        }
    )
);
