import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth/login', { replace: true, state: { from: location } });
        }
    }, [isAuthenticated, navigate, location]);

    if (!isAuthenticated) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
