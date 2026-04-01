import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/lib/notification';
import { useAuthStore } from '../store/auth.store';
import { loginApi } from '../api/auth.api';


export const useLogin = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: loginApi,
        onSuccess: (response) => {
            const { user, accessToken, token } = response.data;
            const resolvedToken = accessToken ?? token;

            // Check if user has admin role
            if (user.role !== 'admin') {
                notify.auth.accessDenied();
                return;
            }

            if (!resolvedToken) {
                notify.auth.loginError('Không nhận được access token từ server');
                return;
            }

            setAuth(user, resolvedToken);
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
