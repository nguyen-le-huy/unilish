import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const objectIdSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

const paramsWithCourseId = z.object({
    courseId: objectIdSchema,
});

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const structureMatrixSchema = z.object({
    vocabCount: z.number().int().min(0).optional(),
    grammarCount: z.number().int().min(0).optional(),
    readingTaskCount: z.number().int().min(0).optional(),
    listeningTaskCount: z.number().int().min(0).optional(),
    writingTaskCount: z.number().int().min(0).optional(),
    speakingTaskCount: z.number().int().min(0).optional(),
});

const finalExamConfigSchema = z.object({
    durationMinutes: z.number().int().min(1).default(60),
    passScore: z.number().min(0).max(100).default(65),
    structureMatrix: structureMatrixSchema.optional(),
    questionPool: z
        .object({
            readingLessonIds: z.array(objectIdSchema).default([]),
            listeningLessonIds: z.array(objectIdSchema).default([]),
        })
        .optional(),
});

// ─── List query ─────────────────────────────────────────────────────────────

export const getCoursesListSchema = z.object({
    query: z.object({
        seriesId: objectIdSchema,
        isActive: z
            .enum(['true', 'false'])
            .optional()
            .transform((val) => (val === undefined ? undefined : val === 'true')),
    }),
});

// ─── Get by ID ────────────────────────────────────────────────────────────────

export const getCourseByIdSchema = z.object({
    params: paramsWithCourseId,
});

export const getCourseTreeSchema = z.object({
    params: paramsWithCourseId,
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
    body: z.object({
        seriesId: objectIdSchema,
        name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự').max(200, 'Tên không được vượt quá 200 ký tự').trim(),
        level: z.enum(CEFR_LEVELS, { error: 'Level không hợp lệ' }),
        orderInSeries: z.number().int().min(1, 'Vị trí phải lớn hơn 0'),
        prerequisiteCourseId: objectIdSchema.optional().nullable(),
        finalExamConfig: finalExamConfigSchema.optional(),
    }),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateCourseSchema = z.object({
    params: paramsWithCourseId,
    body: z
        .object({
            name: z.string().min(3).max(200).trim().optional(),
            level: z.enum(CEFR_LEVELS).optional(),
            orderInSeries: z.number().int().min(1).optional(),
            prerequisiteCourseId: objectIdSchema.nullable().optional(),
            finalExamConfig: finalExamConfigSchema.optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'Phải có ít nhất một trường cần cập nhật'),
});

// ─── Toggle status ────────────────────────────────────────────────────────────

export const toggleCourseSchema = z.object({
    params: paramsWithCourseId,
});

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteCourseSchema = z.object({
    params: paramsWithCourseId,
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type GetCoursesListQuery = z.infer<typeof getCoursesListSchema>['query'];
export type CreateCourseBody = z.infer<typeof createCourseSchema>['body'];
export type UpdateCourseBody = z.infer<typeof updateCourseSchema>['body'];
