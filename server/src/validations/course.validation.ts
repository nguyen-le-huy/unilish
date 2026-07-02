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

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugSchema = z
    .string()
    .min(3, 'Slug phải có ít nhất 3 ký tự')
    .max(200, 'Slug không được vượt quá 200 ký tự')
    .regex(SLUG_REGEX, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang')
    .trim()
    .toLowerCase();

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
        languageId: objectIdSchema.optional(),
        learningGoalId: objectIdSchema.optional(),
        level: z.enum(CEFR_LEVELS).optional(),
        isActive: z
            .enum(['true', 'false'])
            .optional()
            .transform((val) => (val === undefined ? undefined : val === 'true')),
        search: z.string().max(200).optional(),
        page: z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : undefined))
            .pipe(z.number().int().min(1).default(1)),
        limit: z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : undefined))
            .pipe(z.number().int().min(1).max(100).default(20)),
        sort: z.enum(['orderIndex', 'name', 'createdAt']).default('orderIndex'),
        order: z.enum(['asc', 'desc']).default('asc'),
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
        languageId: objectIdSchema,
        learningGoalId: objectIdSchema,
        name: z
            .string()
            .min(3, 'Tên phải có ít nhất 3 ký tự')
            .max(200, 'Tên không được vượt quá 200 ký tự')
            .trim(),
        slug: slugSchema,
        level: z.enum(CEFR_LEVELS, { message: 'Level không hợp lệ' }),
        orderIndex: z.number().int().min(1, 'Vị trí phải lớn hơn 0'),
        description: z.string().max(2000).nullable().optional(),
        thumbnailUrl: z.string().url().nullable().optional(),
        prerequisiteCourseId: objectIdSchema.nullable().optional(),
        finalExamConfig: finalExamConfigSchema.optional(),
    }),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateCourseSchema = z.object({
    params: paramsWithCourseId,
    body: z
        .object({
            name: z.string().min(3).max(200).trim().optional(),
            slug: slugSchema.optional(),
            level: z.enum(CEFR_LEVELS).optional(),
            orderIndex: z.number().int().min(1).optional(),
            description: z.string().max(2000).nullable().optional(),
            thumbnailUrl: z.string().url().nullable().optional(),
            languageId: objectIdSchema.optional(),
            learningGoalId: objectIdSchema.optional(),
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
