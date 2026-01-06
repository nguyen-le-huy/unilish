import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).max(50).optional(),
        bio: z.string().max(200).optional(),
        phoneNumber: z.string().optional(),
        targetLevel: z.string().optional(),
        gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
        address: z
            .object({
                country: z.string(),
                city: z.string(),
            })
            .optional(),
    }),
});

export const getUsersSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        plan: z.enum(['FREE', 'PLUS', 'PRO']).optional(),
        level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        role: z.enum(['student', 'admin', 'content_creator']).optional(),
    }),
});

export const updateSubscriptionSchema = z.object({
    body: z.object({
        plan: z.enum(['FREE', 'PLUS', 'PRO']),
        period: z.enum(['monthly', 'yearly']),
    }),
});

export const updateRoleSchema = z.object({
    body: z.object({
        role: z.enum(['student', 'admin', 'content_creator']),
    }),
});
