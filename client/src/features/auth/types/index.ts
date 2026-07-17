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
    // Backend fields (ObjectId refs)
    learningLanguageId?: string | null;
    learningGoalId?: string | null;
    // Legacy/client-side fields (for backward compatibility)
    nativeLanguage?: string | null;
    learningGoal?: string | null;
    currentLevel?: string;
    lastActiveCourseId?: string | null;
    placementTestScore?: number;
    placementTestCompletedAt?: string | Date | null;
    targetLevel?: string;
    weakSkills?: string[];
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    isVerified?: boolean;
    authProvider?: 'local' | 'google';
    createdAt?: string;
    updatedAt?: string;
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
    accessToken: string;
    refreshToken: string;
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
    fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Địa chỉ email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export type RegisterPayload = z.infer<typeof RegisterSchema>;
