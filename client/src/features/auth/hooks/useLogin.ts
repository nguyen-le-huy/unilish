import { useMutation } from '@tanstack/react-query';
import { login } from '../api/login';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { LoginPayload } from '../types';
import { toast } from 'sonner';

export const useLogin = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: LoginPayload) => login(data),
        onSuccess: (data) => {
            setAuth(data.user, data.token);
            toast.success('Signed in successfully');
            navigate(PATHS.DASHBOARD.HOME);
        },
        onError: (error: any, variables) => {
            const message = error.response?.data?.message || 'Failed to sign in';
            toast.error(message);

            // Redirect to OTP if account is not verified (403 Forbidden)
            if (error.response?.status === 403) {
                navigate(PATHS.AUTH.OTP, { state: { email: variables.email } });
            }
        },
    });
};
