import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const objectIdSchema = z
    .string()
    .trim()
    .regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).max(50).optional(),
        avatarUrl: z.string().url().nullable().optional(),
        phoneNumber: z.string().trim().max(20).nullable().optional(),
        dateOfBirth: z.string().date().nullable().optional(),
        targetLevel: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        currentLevel: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        lastActiveCourseId: objectIdSchema.nullable().optional(),
        learningGoal: z.string().min(1).nullable().optional(),
        nativeLanguage: z.string().min(2).max(10).optional(),
        gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    }),
});

export const getUsersSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        level: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        role: z.enum(['student', 'admin']).optional(),
    }),
});

export const updateRoleSchema = z.object({
    body: z.object({
        role: z.enum(['student', 'admin']),
    }),
});

export const updateLevelSchema = z.object({
    body: z.object({
        level: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    }),
});
