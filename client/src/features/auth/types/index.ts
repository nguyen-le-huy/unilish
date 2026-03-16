import { z } from 'zod';
import type { ApiEnvelope } from '@/types/common';

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginPayload = z.infer<typeof LoginSchema>;

export interface User {
    _id: string;
    email: string;
    fullName: string;
    role: string;
    avatarUrl?: string;
    nativeLanguage?: string | null;
    currentLevel?: string;
    learningGoal?: string | null;
    placementTestScore?: number;
    stats?: UserStats;
    subscription?: unknown;
    phoneNumber?: string;
    bio?: string;
    address?: string;
    dateOfBirth?: string;
}

export interface UserStats {
    xp: number;
    coins: number;
    streak: number;
    longestStreak: number;
    lastActiveAt: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export type { ApiEnvelope };

export interface RegisterResponse {
    status: string;
    message: string;
    email: string;
}

export interface VerifyOTPPayload {
    email: string;
    otp: string;
}



export const RegisterSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterPayload = z.infer<typeof RegisterSchema>;
