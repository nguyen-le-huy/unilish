import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

// ─── Writing sub-schemas ──────────────────────────────────────────────────────

const WRITING_FORMATS = ['EMAIL', 'ESSAY', 'STORY', 'CHAT'] as const;
const WRITING_TONES = ['FORMAL', 'CASUAL', 'NEUTRAL'] as const;
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const writingConfigSchema = z
    .object({
        minWords: z.number().int().min(1),
        maxWords: z.number().int().min(1),
        format: z.enum(WRITING_FORMATS),
        tone: z.enum(WRITING_TONES),
    })
    .refine((value) => value.minWords <= value.maxWords, {
        message: 'minWords không được lớn hơn maxWords',
        path: ['minWords'],
    });

const requiredConceptSchema = z.object({
    id: z.string().min(1),
    conceptId: objectIdSchema,
    keyword: z.string().min(1).max(100),
    points: z.number().int().min(0).max(100),
});

const warmupTaskSchema = z.object({
    id: z.string().min(1),
    type: z.literal('UNSCRAMBLE'),
    words: z.array(z.string().min(1)).min(1),
    correct: z.string().min(1).max(300),
});

// ─── GET /:lessonId/writing/content ──────────────────────────────────────────

export const getWritingContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type GetWritingContentParams = z.infer<typeof getWritingContentSchema>['params'];

// ─── PUT /:lessonId/writing/content ──────────────────────────────────────────

export const saveWritingContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        prompt: z.string().min(1).max(10_000),
        promptTranslation: z.string().max(10_000).default(''),
        config: writingConfigSchema,
        requiredConcepts: z.array(requiredConceptSchema).default([]),
        requiredGrammar: z.string().max(200).default(''),
        sentenceStarters: z.array(z.string().min(1).max(300)).default([]),
        warmupTasks: z.array(warmupTaskSchema).default([]),
        taughtConcepts: z.array(objectIdSchema).default([]),
    }),
});

export type SaveWritingContentBody = z.infer<typeof saveWritingContentSchema>['body'];

// ─── POST /:lessonId/writing/generate ────────────────────────────────────────

export const generateWritingMissionSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        level: z.enum(CEFR_LEVELS),
        format: z.enum(WRITING_FORMATS).default('EMAIL'),
        tone: z.enum(WRITING_TONES).default('FORMAL'),
        minWords: z.number().int().min(20).max(500).default(120),
        maxWords: z.number().int().min(20).max(700).default(180),
        topic: z.string().max(300).trim().optional(),
    }).refine((body) => body.minWords <= body.maxWords, {
        message: 'minWords không được lớn hơn maxWords',
        path: ['minWords'],
    }),
});

export type GenerateWritingMissionBody = z.infer<typeof generateWritingMissionSchema>['body'];

export const testDriveGradeSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        submission: z.string().min(1).max(10_000),
    }),
});

export type TestDriveGradeBody = z.infer<typeof testDriveGradeSchema>['body'];
