import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';


export function AuthGuard({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();
    const hasAuthCredentials = isAuthenticated && Boolean(token);

    useEffect(() => {
        if (!hasAuthCredentials) {
            if (isAuthenticated && !token) {
                logout();
            }
            navigate('/auth/login', { replace: true, state: { from: location } });
        }
    }, [hasAuthCredentials, isAuthenticated, token, logout, navigate, location]);

    if (!hasAuthCredentials) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
