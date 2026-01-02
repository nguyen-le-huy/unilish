import { apiClient } from '@/lib/axios';
import type { LoginFormData, RegisterFormData } from '../types/auth.schema';

// ==================== TYPES ====================

export interface AuthUser {
    _id: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    role: string;
    currentLevel: string;
    stats: {
        xp: number;
        coins: number;
        streak: number;
        longestStreak: number;
        lastActiveAt: string;
    };
    subscription: {
        plan: string;
        status: string;
    };
}

export interface AuthResponse {
    status: string;
    code: number;
    message: string;
    data: {
        user: AuthUser;
        token: string;
    };
}

export interface SyncClerkUserPayload {
    clerkId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
}

// ==================== API FUNCTIONS ====================

/**
 * Traditional login with email/password
 */
export const loginWithEmail = async (payload: LoginFormData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
};

/**
 * Traditional register with email/password
 */
export const registerWithEmail = async (payload: RegisterFormData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
};

// Verify OTP
export const verifyOTP = (data: { email: string; otp: string }): Promise<AuthResponse> => {
    return apiClient.post('/auth/verify-otp', data);
};

/**
 * Sync Clerk user data to MongoDB backend
 * Called after successful Clerk OAuth login
 */
export const syncClerkUser = async (payload: SyncClerkUserPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/sync-clerk', payload);
    return response.data;
};
