import { useMutation } from '@tanstack/react-query';
import { verifyOTP } from '../api/verify-otp';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { toast } from 'sonner';

export const useVerifyOTP = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: { email: string; otp: string }) => verifyOTP(data.email, data.otp),
        onSuccess: (data) => {
            setAuth(data.user, data.token);
            toast.success('Account verified successfully!', { id: 'verify-otp-success' });
            navigate(PATHS.DASHBOARD.HOME);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Verification failed';
            toast.error(message);
        },
    });
};
