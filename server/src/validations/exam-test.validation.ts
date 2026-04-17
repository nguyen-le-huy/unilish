import { z } from 'zod';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const ExamFormatSchema = z.enum(['toeic_lr', 'ielts']);
const ExamStatusSchema = z.enum(['draft', 'active', 'paused', 'archived']);

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

export const getExamTestsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().trim().max(200).optional(),
        format: ExamFormatSchema.optional(),
        status: ExamStatusSchema.optional(),
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

export const createExamTestSchema = z.object({
    body: z.object({
        name: z.string().trim().min(3).max(200),
        format: ExamFormatSchema,
        languageId: mongoIdSchema,
        language: z.string().trim().min(1).max(20),
        description: z.string().trim().max(2000).optional(),
        modules: z.array(ExamModuleSchema).optional(),
        scoringConfig: ScoringConfigSchema.optional(),
        settings: settingsSchema.optional(),
    }),
});

export const updateExamTestSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: createExamTestSchema.shape.body.partial().omit({ format: true }),
});

export const updateExamTestStatusSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: z.object({ status: z.enum(['active', 'paused', 'archived']) }),
});

export const rollbackExamTestSchema = z.object({
    params: z.object({
        id: mongoIdSchema,
        version: z.coerce.number().int().positive(),
    }),
});

export type GetExamTestsQuery = z.infer<typeof getExamTestsSchema>['query'];
export type CreateExamTestBody = z.infer<typeof createExamTestSchema>['body'];
export type UpdateExamTestBody = z.infer<typeof updateExamTestSchema>['body'];
export type UpdateExamTestStatusBody = z.infer<typeof updateExamTestStatusSchema>['body'];
export type RollbackExamTestParams = z.infer<typeof rollbackExamTestSchema>['params'];
export type ParseQuestionsBody = z.infer<typeof parseQuestionsSchema>['body'];
