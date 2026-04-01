import { useMutation } from '@tanstack/react-query';
import { register } from '../api/register';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { RegisterPayload, RegisterResponse } from '../types';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
    message?: string;
}

export const useRegister = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: RegisterPayload) => register(data),
        onSuccess: (response: RegisterResponse) => {
            toast.success(response.message || 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.');
            navigate(PATHS.AUTH.OTP, { state: { email: response.email } });
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const message = error.response?.data?.message || 'Đăng ký thất bại';
            toast.error(message);
        },
    });
};
