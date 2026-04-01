import { useMutation } from '@tanstack/react-query';
import { verifyOTP } from '../api/verify-otp';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { VerifyOTPPayload } from '../types';
import { getPostAuthRedirectPath } from '../utils/onboarding';

interface ApiErrorResponse {
    message?: string;
}

export const useVerifyOTP = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: VerifyOTPPayload) => verifyOTP(data.email, data.otp),
        onSuccess: (data) => {
            setAuth(data.user, data.accessToken, data.refreshToken);
            toast.success('Xác thực tài khoản thành công!', { id: 'verify-otp-success' });
            navigate(getPostAuthRedirectPath(data.user));
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const message = error.response?.data?.message || 'Xác thực tài khoản thất bại';
            toast.error(message);
        },
    });
};
