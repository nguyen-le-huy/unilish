import { z } from 'zod';

// ─── Shared Enums ────────────────────────────────────────────────────────────

const questionSourceEnum = z.enum(['placement_test', 'course', 'practice']);
const questionSkillEnum = z.enum(['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary']);
const questionDifficultyEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const questionStatusEnum = z.enum(['draft', 'in_review', 'published', 'archived']);
const questionTypeEnum = z.enum([
    'MULTIPLE_CHOICE',
    'FILL_IN_BLANK',
    'ERROR_CORRECTION',
    'TRUE_FALSE',
    'MATCHING',
    'PRONUNCIATION',
    'ESSAY',
]);

// ─── Shared Sub-schemas ──────────────────────────────────────────────────────

const stemSchema = z.object({
    text: z.string().trim().max(2000).optional(),
    audioUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
}).refine(
    (stem) => stem.text || stem.audioUrl || stem.imageUrl,
    { message: 'Stem phải có ít nhất một trong: text, audioUrl, hoặc imageUrl' }
);

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

// ─── 1. GET /questions — List with filter + paginate ─────────────────────────

export const getQuestionsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(5).max(100).default(20),
        search: z.string().trim().max(200).optional(),
        languageId: mongoIdSchema.optional(),
        source: questionSourceEnum.optional(),
        skill: questionSkillEnum.optional(),
        part: z.coerce.number().int().min(1).max(7).optional(),
        // Comma-separated: "B1,B2"
        difficulty: z.string().optional(),
        status: questionStatusEnum.optional(),
        type: questionTypeEnum.optional(),
        tags: z.string().optional(),
        createdBy: mongoIdSchema.optional(),
        minCorrectRate: z.coerce.number().min(0).max(100).optional(),
        maxCorrectRate: z.coerce.number().min(0).max(100).optional(),
        sortBy: z
            .enum(['createdAt', 'updatedAt', 'difficulty', 'usageCount', 'avgCorrectRate', 'difficultyLevel'])
            .default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

// ─── 2. GET /questions/:id ───────────────────────────────────────────────────

export const getQuestionByIdSchema = z.object({
    params: z.object({
        id: mongoIdSchema,
    }),
});

// ─── 3. POST /questions — Create ─────────────────────────────────────────────

export const createQuestionSchema = z.object({
    body: z.object({
        languageId: mongoIdSchema,
        testedConcept: mongoIdSchema,
        source: questionSourceEnum,
        skill: questionSkillEnum,
        part: z.number().int().min(1).max(7).optional(),
        difficulty: questionDifficultyEnum,
        difficultyLevel: z.number().int().min(1).max(5).default(1),
        type: questionTypeEnum,
        stem: stemSchema,
        content: z.record(z.string(), z.unknown()),
        explanation: z.string().trim().max(2000).optional(),
        tags: z.array(z.string().trim().min(1).max(50).toLowerCase()).max(20).default([]),
    }),
});

// ─── 4. PUT /questions/:id — Update ──────────────────────────────────────────

export const updateQuestionSchema = z.object({
    params: z.object({
        id: mongoIdSchema,
    }),
    body: z
        .object({
            source: questionSourceEnum.optional(),
            skill: questionSkillEnum.optional(),
            part: z.number().int().min(1).max(7).nullable().optional(),
            difficulty: questionDifficultyEnum.optional(),
            difficultyLevel: z.number().int().min(1).max(5).optional(),
            type: questionTypeEnum.optional(),
            stem: stemSchema.optional(),
            content: z.record(z.string(), z.unknown()).optional(),
            explanation: z.string().trim().max(2000).nullable().optional(),
            tags: z.array(z.string().trim().min(1).max(50).toLowerCase()).max(20).optional(),
            testedConcept: mongoIdSchema.optional(),
        })
        .refine((body) => Object.keys(body).length > 0, { message: 'Cần ít nhất một trường để cập nhật' }),
});

// ─── 5. POST /questions/bulk — Bulk action ───────────────────────────────────

export const bulkActionSchema = z.object({
    body: z.object({
        ids: z.array(mongoIdSchema).min(1, 'Chọn ít nhất 1 câu hỏi').max(100, 'Tối đa 100 câu hỏi mỗi lần'),
        action: z.enum(['set_status', 'add_tag', 'remove_tag', 'delete']),
        payload: z
            .object({
                status: questionStatusEnum.optional(),
                tag: z.string().trim().min(1).max(50).toLowerCase().optional(),
            })
            .optional(),
    }),
});

// ─── 6. PATCH /questions/:id/status — Quick status change ───────────────────

export const updateQuestionStatusSchema = z.object({
    params: z.object({
        id: mongoIdSchema,
    }),
    body: z.object({
        status: questionStatusEnum,
        reviewNote: z.string().trim().max(500).optional(),
    }),
});

// ─── 7. GET /questions/export — Export CSV ───────────────────────────────────

export const exportQuestionsSchema = z.object({
    query: z.object({
        source: questionSourceEnum.optional(),
        skill: questionSkillEnum.optional(),
        difficulty: z.string().optional(),
        status: questionStatusEnum.optional(),
        tags: z.string().optional(),
        format: z.enum(['csv', 'json']).default('csv'),
    }),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type GetQuestionsQuery = z.infer<typeof getQuestionsSchema>['query'];
export type GetQuestionByIdParams = z.infer<typeof getQuestionByIdSchema>['params'];
export type CreateQuestionBody = z.infer<typeof createQuestionSchema>['body'];
export type UpdateQuestionBody = z.infer<typeof updateQuestionSchema>['body'];
export type UpdateQuestionParams = z.infer<typeof updateQuestionSchema>['params'];
export type BulkActionBody = z.infer<typeof bulkActionSchema>['body'];
export type UpdateQuestionStatusBody = z.infer<typeof updateQuestionStatusSchema>['body'];
export type ExportQuestionsQuery = z.infer<typeof exportQuestionsSchema>['query'];
