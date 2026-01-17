import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginPayload = z.infer<typeof LoginSchema>;

export interface AuthResponse {
    token: string;
    user: {
        _id: string;
        email: string;
        fullName: string;
        role: string;
        avatar?: string;
    };
}

export interface SyncClerkPayload {
    clerkId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
}

export const RegisterSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterPayload = z.infer<typeof RegisterSchema>;
