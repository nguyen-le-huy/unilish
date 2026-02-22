import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const objectIdSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

const paramsWithLessonId = z.object({
    lessonId: objectIdSchema,
});

const LESSON_TYPES = [
    'VOCAB',
    'GRAMMAR',
    'READING',
    'LISTENING',
    'SPEAKING',
    'WRITING',
    'UNIT_TEST',
] as const;

const PRACTICE_MODES = ['FIXED', 'DYNAMIC'] as const;

const practiceConfigSchema = z.object({
    mode: z.enum(PRACTICE_MODES).default('FIXED'),
    passingScore: z.number().min(0).max(100).default(80),
    dynamicRules: z
        .object({
            quantity: z.number().int().min(1).max(50).default(5),
            difficulty: z.number().int().min(1).max(5).default(1),
        })
        .optional(),
});

// ─── List query ─────────────────────────────────────────────────────────────

export const getLessonsByUnitIdSchema = z.object({
    query: z.object({
        unitId: objectIdSchema,
    }),
});

// ─── Get by ID ────────────────────────────────────────────────────────────────

export const getLessonByIdSchema = z.object({
    params: paramsWithLessonId,
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createLessonSchema = z.object({
    body: z.object({
        unitId: objectIdSchema,
        title: z.string().min(2, 'Tiêu đề phải có ít nhất 2 ký tự').max(200).trim(),
        type: z.enum(LESSON_TYPES, { error: 'Loại bài học không hợp lệ' }),
        practiceConfig: practiceConfigSchema.optional(),
    }),
});

// ─── Update ──────────────────────────────────────────────────────────────────
// Sprint 1: metadata only — content update deferred to Sprint 2

export const updateLessonSchema = z.object({
    params: paramsWithLessonId,
    body: z
        .object({
            title: z.string().min(2).max(200).trim().optional(),
            type: z.enum(LESSON_TYPES).optional(),
            practiceConfig: practiceConfigSchema.optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'Phải có ít nhất một trường cần cập nhật'),
});

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteLessonSchema = z.object({
    params: paramsWithLessonId,
});

// ─── Reorder ─────────────────────────────────────────────────────────────────

export const reorderLessonsSchema = z.object({
    body: z.object({
        unitId: objectIdSchema,
        orderedIds: z
            .array(objectIdSchema)
            .min(1, 'Phải có ít nhất 1 lesson để sắp xếp'),
    }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateLessonBody = z.infer<typeof createLessonSchema>['body'];
export type UpdateLessonBody = z.infer<typeof updateLessonSchema>['body'];
export type ReorderLessonsBody = z.infer<typeof reorderLessonsSchema>['body'];
