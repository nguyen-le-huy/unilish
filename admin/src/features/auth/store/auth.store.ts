import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    setAuth: (user: User, token: string) => void;
    setToken: (token: string | null) => void;
    setHydrated: (isHydrated: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isHydrated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            setToken: (token) =>
                set((state) => ({
                    token,
                    isAuthenticated: Boolean(token),
                    user: token ? state.user : null,
                })),
            setHydrated: (isHydrated) => set({ isHydrated }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state, error) => {
                if (!state) {
                    return;
                }

                if (!error) {
                    state.setToken(state.token);
                }

                state.setHydrated(true);
            },
        }
    )
);
