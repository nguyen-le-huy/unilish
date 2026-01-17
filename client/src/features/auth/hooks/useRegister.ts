import { useMutation } from '@tanstack/react-query';
import { register } from '../api/register';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { RegisterPayload } from '../types';
import { toast } from 'sonner';

export const useRegister = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: RegisterPayload) => register(data),
        onSuccess: (response: any) => {
            console.log('--- REGISTER SUCCESS ---');
            console.log('Full Response:', response);

            // Response structure: { status, code, message, data: { email, ... } }
            const email = response.data?.email;
            const message = response.data?.message || response.message;

            console.log('Extracted Email:', email);

            toast.success(message || 'Registered successfully. Please check your email for OTP.');

            if (email) {
                console.log('Navigating to OTP page with email:', email);
                setTimeout(() => {
                    navigate(PATHS.AUTH.OTP, { state: { email } });
                }, 100);
            } else {
                console.error("CRITICAL: Missing email in register response!");
            }
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to register';
            toast.error(message);
        },
    });
};
