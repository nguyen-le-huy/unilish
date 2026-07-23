import { z } from 'zod';

const paramsSlugSchema = z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
});

const paramsLanguageCodeSchema = z.object({
    code: z.string().min(2).max(8),
});

export const getLearningGoalsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().trim().optional(),
        isActive: z
            .enum(['true', 'false'])
            .optional()
            .transform((value) => (value === undefined ? undefined : value === 'true')),
    }),
});

export const getLearningGoalBySlugSchema = z.object({
    params: paramsSlugSchema,
});

export const createLearningGoalSchema = z.object({
    body: z.object({
        slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
        title: z.string().min(3).max(120),
        description: z.string().max(1000).optional(),
        targetAudience: z.string().max(300).optional(),
        iconUrl: z.string().url().optional(),
        supportedLanguages: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid language id')).default([]),
        isActive: z.boolean().default(true),
    }),
});

export const updateLearningGoalSchema = z.object({
    params: paramsSlugSchema,
    body: z
        .object({
            title: z.string().min(3).max(120).optional(),
            description: z.string().max(1000).nullable().optional(),
            targetAudience: z.string().max(300).nullable().optional(),
            iconUrl: z.string().url().nullable().optional(),
            supportedLanguages: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid language id')).optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});

export const toggleLearningGoalSchema = z.object({
    params: paramsSlugSchema,
});

export const updateLanguageTtsSchema = z.object({
    params: paramsLanguageCodeSchema,
    body: z.object({
        provider: z.enum(['OPENAI', 'AZURE', 'ELEVENLABS']),
        voiceId: z.string().min(1).max(128).optional(),
    }),
});

export const getLanguagesSchema = z.object({
    query: z.object({
        isActive: z
            .enum(['true', 'false'])
            .optional()
            .transform((value) => (value === undefined ? undefined : value === 'true')),
    }),
});

export type GetLearningGoalsQuery = z.infer<typeof getLearningGoalsSchema>['query'];
export type CreateLearningGoalBody = z.infer<typeof createLearningGoalSchema>['body'];
export type UpdateLearningGoalBody = z.infer<typeof updateLearningGoalSchema>['body'];
export type UpdateLanguageTtsBody = z.infer<typeof updateLanguageTtsSchema>['body'];
