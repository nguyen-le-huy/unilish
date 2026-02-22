import { z } from 'zod';

const SKILL_WEIGHT_TOLERANCE = 0.01;

const skillWeightsSchema = z
    .object({
        listening: z.number().min(0).max(1),
        speaking: z.number().min(0).max(1),
        reading: z.number().min(0).max(1),
        writing: z.number().min(0).max(1),
        grammar: z.number().min(0).max(1),
        vocabulary: z.number().min(0).max(1),
    })
    .refine((weights) => {
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        return Math.abs(total - 1) <= SKILL_WEIGHT_TOLERANCE;
    }, 'Total skill weights must equal 1.0');

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
        targetAudience: z.string().max(300).optional(),
        systemPrompt: z.string().min(30).max(5000),
        skillWeights: skillWeightsSchema,
        ignoredSkills: z.array(z.string().min(1)).default([]),
        isActive: z.boolean().default(true),
    }),
});

export const updateLearningGoalSchema = z.object({
    params: paramsSlugSchema,
    body: z
        .object({
            title: z.string().min(3).max(120).optional(),
            targetAudience: z.string().max(300).nullable().optional(),
            systemPrompt: z.string().min(30).max(5000).optional(),
            skillWeights: skillWeightsSchema.optional(),
            ignoredSkills: z.array(z.string().min(1)).optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});

export const duplicateLearningGoalSchema = z.object({
    params: paramsSlugSchema,
    body: z.object({
        newSlug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
        newTitle: z.string().min(3).max(120),
    }),
});

export const toggleLearningGoalSchema = z.object({
    params: paramsSlugSchema,
});

export const testLearningGoalSchema = z.object({
    params: paramsSlugSchema,
    body: z.object({
        draftConfig: z.object({
            systemPrompt: z.string().min(30).max(5000),
            skillWeights: skillWeightsSchema,
            ignoredSkills: z.array(z.string()).optional(),
        }),
        scenario: z.object({
            userInput: z.string().min(1).max(500),
            context: z.string().max(500).optional(),
        }),
    }),
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
export type DuplicateLearningGoalBody = z.infer<typeof duplicateLearningGoalSchema>['body'];
export type TestLearningGoalBody = z.infer<typeof testLearningGoalSchema>['body'];
export type UpdateLanguageTtsBody = z.infer<typeof updateLanguageTtsSchema>['body'];
