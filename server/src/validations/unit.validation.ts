import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const objectIdSchema = z
    .string()
    .regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

const paramsWithUnitId = z.object({
    unitId: objectIdSchema,
});

const contextSeedSchema = z.object({
    scenario: z.string().trim().max(500).optional(),
    keywords: z.array(z.string().trim().min(1)).default([]),
    culturalNotes: z.string().trim().max(1000).optional(),
});

// ─── List query ─────────────────────────────────────────────────────────────

export const getUnitsByCoursIdSchema = z.object({
    query: z.object({
        courseId: objectIdSchema,
    }),
});

// ─── Get by ID ────────────────────────────────────────────────────────────────

export const getUnitByIdSchema = z.object({
    params: paramsWithUnitId,
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createUnitSchema = z.object({
    body: z.object({
        courseId: objectIdSchema,
        title: z.string().min(2, 'Tiêu đề phải có ít nhất 2 ký tự').max(200).trim(),
        description: z.string().trim().max(500).optional(),
        thumbnailUrl: z.string().url('URL không hợp lệ').optional().nullable(),
        contextSeed: contextSeedSchema.optional(),
    }),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateUnitSchema = z.object({
    params: paramsWithUnitId,
    body: z
        .object({
            title: z.string().min(2).max(200).trim().optional(),
            description: z.string().trim().max(500).nullable().optional(),
            thumbnailUrl: z.string().url('URL không hợp lệ').nullable().optional(),
            contextSeed: contextSeedSchema.optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'Phải có ít nhất một trường cần cập nhật'),
});

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteUnitSchema = z.object({
    params: paramsWithUnitId,
});

// ─── Reorder ─────────────────────────────────────────────────────────────────

export const reorderUnitsSchema = z.object({
    body: z.object({
        courseId: objectIdSchema,
        orderedIds: z
            .array(objectIdSchema)
            .min(1, 'Phải có ít nhất 1 unit để sắp xếp'),
    }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateUnitBody = z.infer<typeof createUnitSchema>['body'];
export type UpdateUnitBody = z.infer<typeof updateUnitSchema>['body'];
export type ReorderUnitsBody = z.infer<typeof reorderUnitsSchema>['body'];
