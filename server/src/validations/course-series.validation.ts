import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9-]+$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const slugSchema = z
    .string()
    .min(3, 'Slug phải có ít nhất 3 ký tự')
    .max(64, 'Slug không được vượt quá 64 ký tự')
    .regex(SLUG_REGEX, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang');

const objectIdSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

const paramsSlugSchema = z.object({
    slug: slugSchema,
});

// ─── List query ─────────────────────────────────────────────────────────────

export const getCourseSeriesListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().trim().optional(),
        isActive: z
            .enum(['true', 'false'])
            .optional()
            .transform((val) => (val === undefined ? undefined : val === 'true')),
        languageId: objectIdSchema.optional(),
        learningGoalId: objectIdSchema.optional(),
    }),
});

// ─── Get by slug ─────────────────────────────────────────────────────────────

export const getCourseSeriesBySlugSchema = z.object({
    params: paramsSlugSchema,
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createCourseSeriesSchema = z.object({
    body: z.object({
        slug: slugSchema,
        title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').max(120, 'Tiêu đề không được vượt quá 120 ký tự'),
        description: z.string().max(500, 'Mô tả không được vượt quá 500 ký tự').optional(),
        thumbnailUrl: z.string().url('URL thumbnail không hợp lệ').optional(),
        languageId: objectIdSchema,
        learningGoalId: objectIdSchema,
        isActive: z.boolean().default(true),
    }),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateCourseSeriesSchema = z.object({
    params: paramsSlugSchema,
    body: z
        .object({
            title: z.string().min(3).max(120).optional(),
            description: z.string().max(500).nullable().optional(),
            thumbnailUrl: z.string().url('URL thumbnail không hợp lệ').nullable().optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'Phải có ít nhất một trường cần cập nhật'),
});

// ─── Toggle status ────────────────────────────────────────────────────────────

export const toggleCourseSeriesSchema = z.object({
    params: paramsSlugSchema,
});

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteCourseSeriesSchema = z.object({
    params: paramsSlugSchema,
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type GetCourseSeriesListQuery = z.infer<typeof getCourseSeriesListSchema>['query'];
export type CreateCourseSeriesBody = z.infer<typeof createCourseSeriesSchema>['body'];
export type UpdateCourseSeriesBody = z.infer<typeof updateCourseSeriesSchema>['body'];
