import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/auth';

// Session storage key for refreshToken (separate from main persist store)
const SESSION_RT_KEY = 'admin_rt';

const getSessionRefreshToken = (): string | null => {
    try {
        return sessionStorage.getItem(SESSION_RT_KEY);
    } catch {
        return null;
    }
};

const setSessionRefreshToken = (token: string | null): void => {
    try {
        if (token) {
            sessionStorage.setItem(SESSION_RT_KEY, token);
        } else {
            sessionStorage.removeItem(SESSION_RT_KEY);
        }
    } catch {
        // sessionStorage not available
    }
};

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    setAuth: (user: User, token: string, refreshToken?: string) => void;
    setToken: (token: string | null) => void;
    setRefreshToken: (refreshToken: string | null) => void;
    setHydrated: (isHydrated: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: getSessionRefreshToken(), // Load from sessionStorage on init
            isAuthenticated: false,
            isHydrated: false,
            setAuth: (user, token, refreshToken) => {
                setSessionRefreshToken(refreshToken ?? null);
                set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true });
            },
            setToken: (token) =>
                set((state) => ({
                    token,
                    isAuthenticated: Boolean(token),
                    user: token ? state.user : null,
                })),
            setRefreshToken: (refreshToken) => {
                setSessionRefreshToken(refreshToken);
                set({ refreshToken });
            },
            setHydrated: (isHydrated) => set({ isHydrated }),
            logout: () => {
                setSessionRefreshToken(null);
                set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                // refreshToken stored separately in sessionStorage, NOT here
            }),
            onRehydrateStorage: () => (state, error) => {
                if (!state) {
                    return;
                }

                if (!error) {
                    // Sync refreshToken from sessionStorage after hydration
                    const sessionRt = getSessionRefreshToken();
                    state.setToken(state.token);
                    if (sessionRt) {
                        state.setRefreshToken(sessionRt);
                    }
                }

                state.setHydrated(true);
            },
        }
    )
);
