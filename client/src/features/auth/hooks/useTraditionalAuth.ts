import { useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail, registerWithEmail, type AuthResponse } from '../api/auth-api';
import type { LoginFormData, RegisterFormData } from '../types/auth.schema';
import { notify } from '@/lib/notification';

// Storage keys
const USER_STORAGE_KEY = 'unilish_user';
const TOKEN_STORAGE_KEY = 'unilish_token';

/**
 * Hook for traditional email/password authentication
 */
export const useTraditionalAuth = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Store auth data in localStorage
     */
    const storeAuthData = (response: AuthResponse) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
        localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
    };

    /**
     * Login with email and password
     */
    const login = async (data: LoginFormData) => {
        setIsLoading(true);
        try {
            const response = await loginWithEmail(data);
            storeAuthData(response);
            notify.auth.loginSuccess();
            navigate('/dashboard');
            return response;
        } catch (error: unknown) {
            // Handle Unverified Account (403)
            if (error instanceof AxiosError && error.response?.status === 403) {
                notify.auth.otpSent(data.email); // Reuse OTP sent notification
                navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
                return;
            }

            const message = error instanceof AxiosError
                ? (error.response?.data as { message?: string })?.message || 'Đăng nhập thất bại'
                : 'Đăng nhập thất bại';
            notify.auth.loginError(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Register with email and password
     */
    const register = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            const response = await registerWithEmail(data);
            // Note: Register logic now requires OTP, so no token is returned yet.
            // Do not storeAuthData here.

            notify.auth.otpSent(data.email);
            navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
            return response;
        } catch (error: unknown) {
            const message = error instanceof AxiosError
                ? (error.response?.data as { message?: string })?.message || 'Đăng ký thất bại'
                : 'Đăng ký thất bại';
            notify.auth.registerError(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        login,
        register,
        isLoading,
    };
};
