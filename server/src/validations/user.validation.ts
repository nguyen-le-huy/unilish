import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
        phoneNumber: z.string().optional().nullable(),
        bio: z.string().max(500, 'Bio không được quá 500 ký tự').optional(),
        address: z.object({
            country: z.string().optional(),
            city: z.string().optional(),
        }).optional(),
        dateOfBirth: z.coerce.date().optional(),
    }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
