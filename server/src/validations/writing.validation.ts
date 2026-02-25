import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

// ─── Writing sub-schemas ──────────────────────────────────────────────────────

const WRITING_TASK_TYPES = ['essay', 'email', 'report', 'letter', 'summary', 'paragraph'] as const;
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const writingRubricCriterionSchema = z.object({
    id: z.string().min(1, 'ID tiêu chí không được để trống'),
    name: z.string().min(1, 'Tên tiêu chí không được để trống').max(100).trim(),
    description: z.string().min(1, 'Mô tả tiêu chí không được để trống').max(500).trim(),
    maxScore: z.number().int().min(1).max(100),
});

const writingPracticeConfigSchema = z.object({
    mode: z.literal('FIXED'),
    passingScore: z.number().int().min(0).max(100).default(70),
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
        taskType: z.enum(WRITING_TASK_TYPES).optional(),
        prompt: z.string().max(5_000).optional(),
        promptTranslation: z.string().max(8_000).optional(),
        wordCountTarget: z.number().int().min(50).max(1_000).optional(),
        wordCountMin: z.number().int().min(30).max(1_000).optional(),
        wordCountMax: z.number().int().min(50).max(1_500).optional(),
        modelAnswer: z.string().max(10_000).optional(),
        rubric: z.array(writingRubricCriterionSchema).min(1).max(10).optional(),
        practiceConfig: writingPracticeConfigSchema.optional(),
        generationStatus: z
            .enum(['IDLE', 'GENERATING', 'DONE', 'ERROR'])
            .optional(),
    }).refine(
        (body) => Object.keys(body).length > 0,
        'Phải có ít nhất một trường cần cập nhật',
    ),
});

export type SaveWritingContentBody = z.infer<typeof saveWritingContentSchema>['body'];

// ─── POST /:lessonId/writing/generate ────────────────────────────────────────

export const generateWritingSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        level: z.enum(CEFR_LEVELS),
        taskType: z.enum(WRITING_TASK_TYPES).default('essay'),
        wordCountTarget: z.number().int().min(50).max(800).default(250),
        topic: z.string().max(300).trim().optional(),
    }),
});

export type GenerateWritingBody = z.infer<typeof generateWritingSchema>['body'];
