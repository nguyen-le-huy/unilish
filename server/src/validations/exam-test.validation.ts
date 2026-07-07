import { z } from 'zod';
import { DraftIeltsPracticeContentSchema } from './ielts-content.validation.js';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const ExamFormatSchema = z.enum(['toeic_lr', 'ielts']);
const ExamStatusSchema = z.enum(['draft', 'active', 'paused', 'archived']);
const ExamKindSchema = z.enum(['full_exam', 'skill_practice']);
const IeltsSkillSchema = z.enum(['listening', 'reading', 'writing', 'speaking']);

const ExamQuestionItemSchema = z.object({
    question: z.string().trim().min(1),
    options: z.object({
        A: z.string().trim().min(1),
        B: z.string().trim().min(1),
        C: z.string().trim().min(1),
        D: z.string().trim().min(1),
    }),
    correctOption: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().trim().optional(),
    transcript: z.string().trim().optional(),
    audioUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    imageUrls: z.array(z.string().url()).optional(),
});

const ExamPartConfigSchema = z.object({
    part: z.number().int().positive(),
    name: z.string().trim().min(1),
    questionsCount: z.number().int().positive(),
    poolTag: z.string().trim().min(1),
    manualContent: z
        .object({
            questionItems: z.array(ExamQuestionItemSchema).optional(),
            audioUrl: z.string().url().optional(),
            groupPattern: z.array(z.number().int().positive()).optional(),
        })
        .optional(),
});

const ExamModuleListeningSchema = z.object({
    type: z.literal('listening'),
    name: z.string().trim().min(1),
    timeLimitMinutes: z.number().int().positive(),
    audioUrl: z.string().url().optional(),
    parts: z.array(ExamPartConfigSchema),
});

const ExamModuleReadingSchema = z.object({
    type: z.literal('reading'),
    name: z.string().trim().min(1),
    timeLimitMinutes: z.number().int().positive(),
    parts: z.array(ExamPartConfigSchema),
});

const ExamModuleWritingSchema = z.object({
    type: z.literal('writing'),
    name: z.string().trim().min(1),
    timeLimitMinutes: z.number().int().positive(),
    tasks: z.array(
        z.object({
            task: z.union([z.literal(1), z.literal(2)]),
            minWords: z.number().int().positive(),
            topics: z.array(z.string().trim()),
        }),
    ),
});

const speakingTopicSchema = z.object({
    text: z.string().trim().min(1),
    audioKey: z.string().trim().min(1).optional(),
});

const ExamModuleSpeakingSchema = z.object({
    type: z.literal('speaking'),
    name: z.string().trim().min(1),
    part1Topics: z.array(speakingTopicSchema),
    part2CueCards: z.array(
        z.object({
            text: z.string().trim().min(1),
            shouldSay: z.array(z.string().trim().min(1)).optional(),
            audioKey: z.string().trim().min(1).optional(),
        }),
    ),
    part3Topics: z.array(speakingTopicSchema),
});

const ExamModuleSchema = z.discriminatedUnion('type', [
    ExamModuleListeningSchema,
    ExamModuleReadingSchema,
    ExamModuleWritingSchema,
    ExamModuleSpeakingSchema,
]);

const BandThresholdSchema = z.object({
    band: z.string().trim().min(1),
    minScore: z.number().min(0).max(1),
    maxScore: z.number().min(0).max(1),
});

const ScoringConfigSchema = z.object({
    framework: z.enum(['toeic_score', 'ielts_band']),
    bandThresholds: z.array(BandThresholdSchema),
});

const settingsSchema = z.object({
    allowRetake: z.boolean().default(false),
    retakeCooldownDays: z.number().int().min(0).default(30),
    timeLimitOverrideMinutes: z.number().int().positive().optional(),
});

// ─── Slug schema ─────────────────────────────────────────────────────────────

const slugSchema = z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

// ─── List query ──────────────────────────────────────────────────────────────

export const getExamTestsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().trim().max(200).optional(),
        format: ExamFormatSchema.optional(),
        kind: ExamKindSchema.optional(),
        status: ExamStatusSchema.optional(),
        skill: IeltsSkillSchema.optional(),
    }),
});

export const getExamTestByIdSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

export const getVersionHistorySchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

export const analyticsExamTestSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

export const parseQuestionsSchema = z.object({
    body: z.object({
        rawText: z.string().trim().min(1).max(200000),
    }),
});

// ─── Base exam test body (no refinements — safe for .partial() in Zod v4) ────

const examTestBaseBodySchema = z.object({
    name: z.string().trim().min(3).max(200),
    format: ExamFormatSchema,
    kind: ExamKindSchema.optional().default('full_exam'),
    slug: slugSchema.optional(),
    languageId: mongoIdSchema,
    language: z.string().trim().min(1).max(20),
    description: z.string().trim().max(2000).optional(),
    skill: IeltsSkillSchema.optional(),
    durationMinutes: z.number().int().positive().optional(),
    modules: z.array(ExamModuleSchema).optional(),
    content: DraftIeltsPracticeContentSchema.optional(),
    scoringConfig: ScoringConfigSchema.optional(),
    settings: settingsSchema.optional(),
});

// ─── Create exam test (legacy + IELTS practice) ──────────────────────────────

export const createExamTestSchema = z.object({
    body: examTestBaseBodySchema.refine(
        (data) => {
            if (data.kind === 'skill_practice') {
                return data.skill !== undefined && data.content !== undefined;
            }
            return true;
        },
        { message: 'skill và content là bắt buộc khi kind=skill_practice' },
    ),
});

// ─── Update exam test ────────────────────────────────────────────────────────

export const updateExamTestSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: examTestBaseBodySchema.partial().omit({ format: true }),
});

// ─── Status update ───────────────────────────────────────────────────────────

export const updateExamTestStatusSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: z.object({ status: z.enum(['active', 'paused', 'archived']) }),
});

// ─── Rollback ────────────────────────────────────────────────────────────────

export const rollbackExamTestSchema = z.object({
    params: z.object({
        id: mongoIdSchema,
        version: z.coerce.number().int().positive(),
    }),
});

// ─── Create version ──────────────────────────────────────────────────────────

export const createVersionSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: z.object({
        patch: z.record(z.string(), z.unknown()).optional(),
    }),
});

// ─── Validate publish ────────────────────────────────────────────────────────

export const validatePublishSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

// ─── Delete (soft-delete = archive) ──────────────────────────────────────────

export const deleteExamTestSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

// ─── Learner schemas ─────────────────────────────────────────────────────────

export const ieltsSummarySchema = z.object({
    query: z.object({}),
});

export const ieltsListTestsSchema = z.object({
    query: z.object({
        skill: IeltsSkillSchema,
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().trim().max(200).optional(),
    }),
});

export const ieltsTestDetailSchema = z.object({
    params: z.object({
        slug: z.string().trim().min(1).max(200),
    }),
});

// ─── Exported types ──────────────────────────────────────────────────────────

export type GetExamTestsQuery = z.infer<typeof getExamTestsSchema>['query'];
export type CreateExamTestBody = z.infer<typeof createExamTestSchema>['body'];
export type UpdateExamTestBody = z.infer<typeof updateExamTestSchema>['body'];
export type UpdateExamTestStatusBody = z.infer<typeof updateExamTestStatusSchema>['body'];
export type RollbackExamTestParams = z.infer<typeof rollbackExamTestSchema>['params'];
export type ParseQuestionsBody = z.infer<typeof parseQuestionsSchema>['body'];
export type CreateVersionBody = z.infer<typeof createVersionSchema>['body'];
export type IeltsListTestsQuery = z.infer<typeof ieltsListTestsSchema>['query'];
export type IeltsTestDetailParams = z.infer<typeof ieltsTestDetailSchema>['params'];
