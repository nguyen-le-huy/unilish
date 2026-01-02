import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/lib/notification';
import type { LoginFormData } from '../types/auth.schema';
import type { User } from '@/types/auth';

interface AuthApiResponse {
    status: string;
    code: number;
    message: string;
    data: {
        user: User;
        token: string;
    };
}

export const useLogin = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: async (data: LoginFormData): Promise<AuthApiResponse> => {
            const response = await apiClient.post<AuthApiResponse>('/auth/login', data);
            return response.data;
        },
        onSuccess: (response) => {
            const { user, token } = response.data;

            // Check if user has admin role
            if (user.role !== 'admin') {
                notify.auth.accessDenied();
                return;
            }

            setAuth(user, token);
            notify.auth.loginSuccess();
            navigate('/dashboard');
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            const message = error.response?.data?.message;
            notify.auth.loginError(message);
        },
    });
};

export const useLogout = () => {
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);

    return () => {
        logout();
        notify.auth.logoutSuccess();
        navigate('/auth/login');
    };
};
