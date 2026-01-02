import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email là bắt buộc')
        .email('Email không hợp lệ'),
    password: z
        .string()
        .min(1, 'Mật khẩu là bắt buộc')
        .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// Register schema
export const registerSchema = z.object({
    fullName: z
        .string()
        .min(1, 'Họ và tên là bắt buộc')
        .min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
    email: z
        .string()
        .min(1, 'Email là bắt buộc')
        .email('Email không hợp lệ'),
    password: z
        .string()
        .min(1, 'Mật khẩu là bắt buộc')
        .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// Infer types from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
