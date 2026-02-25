import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

// ─── Listening Sub-schemas ────────────────────────────────────────────────────

const audioWordSchema = z.object({
    word: z.string().min(1).max(200).trim(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    conceptId: z.string().optional(),
    isTargetVocab: z.boolean().default(false),
});

const transcriptLineSchema = z.object({
    id: z.string().min(1, 'ID dòng thoại không được để trống'), // UUID
    speaker: z.string().min(1, 'Tên nhân vật không được để trống').max(100).trim(),
    role: z.string().min(1, 'Vai trò không được để trống').max(100).trim(),
    text: z.string().min(1, 'Nội dung thoại không được để trống').max(2000).trim(),
    translation: z.string().max(2000).trim().optional().default(''),
    startTime: z.number().nonnegative().default(0),
    endTime: z.number().nonnegative().default(0),
    words: z.array(audioWordSchema).default([]),
});

const listeningMediaSchema = z.object({
    audioUrl: z
        .string()
        .refine(
            (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
            'audioUrl phải là URL hợp lệ hoặc đường dẫn nội bộ bắt đầu bằng /',
        )
        .nullable()
        .default(null),
    duration: z.number().nonnegative().default(0),
    accent: z.enum(['en-US', 'en-UK', 'mixed']).default('en-US'),
    noiseLevel: z.enum(['none', 'low', 'medium', 'high']).default('none'),
    speed: z.number().min(0.5).max(2.0).default(1.0),
});

const listeningInteractiveConfigSchema = z.object({
    mode: z.enum(['GAP_FILL', 'SHADOWING']).default('GAP_FILL'),
    hidePercentage: z.number().int().min(0).max(100).default(20),
    allowSlowSpeed: z.boolean().default(true),
});

const listeningPracticeConfigSchema = z.object({
    mode: z.literal('FIXED'),
    passingScore: z.number().int().min(0).max(100).default(80),
});

// ─── GET /:lessonId/listening/content ────────────────────────────────────────

export const getListeningContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type GetListeningContentParams = z.infer<typeof getListeningContentSchema>['params'];

// ─── PUT /:lessonId/listening/content ────────────────────────────────────────

export const saveListeningContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        media: listeningMediaSchema.optional(),
        transcript: z.array(transcriptLineSchema).default([]),
        interactiveConfig: listeningInteractiveConfigSchema.optional(),
        practiceConfig: listeningPracticeConfigSchema.optional(),
        generationStatus: z
            .enum(['IDLE', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'SYNCING', 'DONE', 'ERROR'])
            .optional(),
    }),
});

export type SaveListeningContentBody = z.infer<typeof saveListeningContentSchema>['body'];

// ─── POST /:lessonId/listening/generate-script ───────────────────────────────

export const generateListeningScriptSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        lineCount: z.number().int().min(4).max(30).default(8),
        speakerCount: z.number().int().min(2).max(4).default(2),
        scriptFormat: z.enum(['DIALOGUE', 'PODCAST', 'NEWS']).default('DIALOGUE'),
        topic: z.string().max(300).trim().optional(),
    }),
});

export type GenerateListeningScriptBody = z.infer<typeof generateListeningScriptSchema>['body'];

// ─── POST /:lessonId/listening/mix-and-sync ──────────────────────────────────

export const mixAndSyncSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        // Optional speaker-to-ElevenLabs-voice mapping; server uses default if omitted
        speakerVoiceMap: z.record(z.string(), z.string()).optional(),
    }),
});

export type MixAndSyncBody = z.infer<typeof mixAndSyncSchema>['body'];

// ─── DELETE /:lessonId/listening/mix-and-sync ──────────────────────────────────

export const cancelMixAndSyncSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type CancelMixAndSyncParams = z.infer<typeof cancelMixAndSyncSchema>['params'];

// ─── GET /:lessonId/listening/sync-status ────────────────────────────────────

export const getSyncStatusSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── POST /:lessonId/listening/generate-questions ───────────────────────────

export const generateListeningQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        count: z.number().int().min(1).max(20).default(6),
        types: z
            .array(z.enum(['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'TRUE_FALSE'] as const))
            .min(1)
            .optional(),
        distribution: z
            .object({
                multipleChoice: z.number().int().min(0).max(20).default(0),
                fillInBlank: z.number().int().min(0).max(20).default(0),
                trueFalse: z.number().int().min(0).max(20).default(0),
            })
            .optional(),
    }).refine(
        (body) => {
            if (body.distribution) {
                const total =
                    body.distribution.multipleChoice
                    + body.distribution.fillInBlank
                    + body.distribution.trueFalse;
                return total > 0;
            }
            return body.count > 0;
        },
        { message: 'Cần ít nhất 1 câu hỏi để tạo.' },
    ),
});

export type GenerateListeningQuestionsBody = z.infer<typeof generateListeningQuestionsSchema>['body'];

// ─── GET /:lessonId/listening/questions ─────────────────────────────────────

export const getListeningQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── POST /:lessonId/listening/questions/:questionId/swap ───────────────────

export const swapListeningQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
});

// ─── PUT /:lessonId/listening/questions/:questionId ─────────────────────────

export const updateListeningQuestionSchema = z.object({
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

export type UpdateListeningQuestionBody = z.infer<typeof updateListeningQuestionSchema>['body'];

// ─── DELETE /:lessonId/listening/questions/:questionId ──────────────────────

export const deleteListeningQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
});
