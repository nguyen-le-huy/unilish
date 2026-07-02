import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const objectIdSchema = z
    .string()
    .trim()
    .regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).max(50).optional(),
        bio: z.string().max(200).optional(),
        phoneNumber: z.string().optional(),
        targetLevel: z.string().optional(),
        currentLevel: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        lastActiveCourseId: objectIdSchema.nullable().optional(),
        learningGoal: z.string().min(1).nullable().optional(),
        nativeLanguage: z.string().min(2).max(10).optional(),
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
        level: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        role: z.enum(['student', 'admin', 'content_creator']).optional(),
    }),
});

export const updateRoleSchema = z.object({
    body: z.object({
        role: z.enum(['student', 'admin', 'content_creator']),
    }),
});

export const updateLevelSchema = z.object({
    body: z.object({
        level: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    }),
});
