import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { PATHS } from '@/config/paths';
import { useSyncAuthUser } from '@/features/auth/hooks/use-sync-auth-user';

export const ProtectedRoute = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const hasAuthCredentials = isAuthenticated && (Boolean(token) || Boolean(user));

    useSyncAuthUser();

    useEffect(() => {
        if (isAuthenticated && !hasAuthCredentials) {
            logout();
        }
    }, [hasAuthCredentials, isAuthenticated, logout]);

    if (!hasAuthCredentials) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    return <Outlet />;
};
