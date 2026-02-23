import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

// ─── Reading sub-schemas ──────────────────────────────────────────────────────

const readingGlossaryItemSchema = z.object({
    word: z.string().min(1, 'Từ vựng không được để trống').max(200).trim(),
    definition: z.string().min(1, 'Định nghĩa không được để trống').max(1000).trim(),
    type: z.enum(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other']),
    ipa: z.string().max(200).trim().default(''),
});

const readingMediaSchema = z.object({
    audioUrl: z.string().nullable().default(null),
    durationSec: z.number().nonnegative().default(0),
    speed: z.number().min(0.5).max(2.0).default(1.0),
});

const readingPracticeConfigSchema = z.object({
    mode: z.literal('FIXED'),
    passingScore: z.number().int().min(0).max(100).default(80),
});

// ─── GET /:lessonId/reading/content ──────────────────────────────────────────

export const getReadingContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type GetReadingContentParams = z.infer<typeof getReadingContentSchema>['params'];

// ─── PUT /:lessonId/reading/content ──────────────────────────────────────────

export const saveReadingContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        text: z.string().max(20_000).default(''),
        translation: z.string().max(30_000).default(''),
        glossary: z.record(z.string(), readingGlossaryItemSchema).default({}),
        media: readingMediaSchema.optional(),
        practiceConfig: readingPracticeConfigSchema.optional(),
        generationStatus: z
            .enum(['IDLE', 'GENERATING', 'GENERATING_AUDIO', 'DONE', 'ERROR'])
            .optional(),
    }),
});

export type SaveReadingContentBody = z.infer<typeof saveReadingContentSchema>['body'];

// ─── POST /:lessonId/reading/generate ────────────────────────────────────────

export const generateReadingSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
        textType: z.enum(['email', 'report', 'news', 'story']).default('story'),
        wordCount: z.number().int().min(50).max(600).default(200),
        topic: z.string().max(300).optional(),
    }),
});

export type GenerateReadingBody = z.infer<typeof generateReadingSchema>['body'];

// ─── POST /:lessonId/reading/generate-audio ──────────────────────────────────

export const generateReadingAudioSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── POST /:lessonId/reading/fill-glossary ───────────────────────────────────

export const fillGlossarySchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── POST /:lessonId/reading/generate-questions ──────────────────────────────

export const generateReadingQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        count: z.number().int().min(1).max(10).default(5),
        types: z
            .array(z.enum(['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'TRUE_FALSE'] as const))
            .min(1)
            .optional(),
    }),
});

export type GenerateReadingQuestionsBody = z.infer<typeof generateReadingQuestionsSchema>['body'];

// ─── GET /:lessonId/reading/questions ────────────────────────────────────────

export const getReadingQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── POST /:lessonId/reading/questions/:questionId/swap ──────────────────────

export const swapReadingQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
});

// ─── PUT /:lessonId/reading/questions/:questionId ────────────────────────────

export const updateReadingQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
    body: z.object({
        stem: z
            .object({
                text: z.string().min(1).max(1000).trim().optional(),
                audioUrl: z.string().nullable().optional(),
            })
            .optional(),
        explanation: z.string().max(1000).nullable().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
    }),
});

export type UpdateReadingQuestionBody = z.infer<typeof updateReadingQuestionSchema>['body'];

// ─── DELETE /:lessonId/reading/questions/:questionId ─────────────────────────

export const deleteReadingQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
});
