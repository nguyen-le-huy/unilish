import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Email không hợp lệ'),
        password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
        fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Email không hợp lệ'),
        password: z.string().min(1, 'Mật khẩu là bắt buộc'),
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email('Email không hợp lệ'),
        otp: z.string().length(6, 'Mã OTP phải có 6 chữ số'),
    }),
});

export const syncClerkSchema = z.object({
    body: z.object({
        clerkId: z.string().min(1, 'Clerk ID là bắt buộc'),
        email: z.string().email('Email não hợp lệ'),
        fullName: z.string().optional(),
        avatarUrl: z.string().url('Avatar URL không hợp lệ').optional(),
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type SyncClerkInput = z.infer<typeof syncClerkSchema>['body'];
