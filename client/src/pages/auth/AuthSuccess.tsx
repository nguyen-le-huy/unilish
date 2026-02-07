import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/axios';
import { PATHS } from '@/config/paths';
import { toast } from 'sonner';
import { Loading } from '@/components/common/Loading/Loading';
import type { User } from '@/features/auth/types';

const AuthSuccess = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const isFetching = useRef(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (isFetching.current) return;
            isFetching.current = true;

            // Temporarily clear any stale token so axios doesn't send bad header
            useAuthStore.getState().logout();

            try {
                // Fetch user profile using session cookie
                const response = await api.get<{ data: User }>('/users/me');

                // Assuming response.data contains the user object directly or nested
                // My API usually returns { status: 'success', data: user } or similar wrapper?
                // Let's check UserController.getProfile returns sendResponse(res, 200, '...', user);
                // sendResponse wrapper: details usually in data or payload?
                // sendResponse(res, code, message, data).
                // Client axios interceptor returns response.data directly.
                // So result is { status, message, data: user }.

                const user = (response as any).data;

                if (user) {
                    setAuth(user, 'cookie'); // Use 'cookie' as placeholder token or null
                    toast.success('Successfully logged in with Google');
                    navigate(PATHS.DASHBOARD.HOME);
                } else {
                    throw new Error('No user data received');
                }
            } catch (error) {
                console.error('Auth check failed', error);
                toast.error('Authentication failed. Please try again.');
                navigate(PATHS.AUTH.LOGIN);
            } finally {
                // Determine if we should reset isFetching. 
                // Since this is a one-off redirect page, we likely don't want to re-run it ever.
                // But for safety in strict mode hot reload... actually keeping it true prevents double trigger.
            }
        };

        fetchUser();
    }, [navigate, setAuth]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loading />
            <p className="ml-4 text-gray-500">Completing login...</p>
        </div>
    );
};

export default AuthSuccess;
