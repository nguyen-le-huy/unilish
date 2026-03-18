import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const cefrLevelEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const placementStatusEnum = z.enum(['draft', 'active', 'paused', 'archived']);
const moduleTypeEnum = z.enum(['mcq', 'essay', 'speaking']);

// ─── Module Sub-schemas ───────────────────────────────────────────────────────

const partConfigSchema = z.object({
    part: z.number().int().min(1),
    name: z.string().trim().min(1).max(100),
    questionsCount: z.number().int().min(1),
    poolTag: z.string().trim().min(1).max(100),
    difficultyDistribution: z.record(z.string(), z.number().int().min(0)).default({}),
    excludeRecentDays: z.number().int().min(0).default(30),
    topicFilter: z.array(z.string().trim()).default([]),
    manualContent: z
        .object({
            passageText: z.string().trim().max(5000).optional(),
            groupPattern: z.array(z.number().int().min(2).max(7)).default([]),
            questions: z.array(z.string().trim().min(1)).default([]),
            questionItems: z
                .array(
                    z.object({
                        question: z.string().trim().min(1).max(500),
                        options: z.object({
                            A: z.string().trim().min(1).max(300),
                            B: z.string().trim().min(1).max(300),
                            C: z.string().trim().min(1).max(300),
                            D: z.string().trim().min(1).max(300),
                        }),
                        correctOption: z.enum(['A', 'B', 'C', 'D']),
                        explanation: z.string().trim().max(2000).optional(),
                        transcript: z.string().trim().max(5000).optional(),
                        mediaUrl: z.string().url().optional(),
                        imageUrl: z.string().url().optional(),
                        imageUrls: z.array(z.string().url()).default([]),
                        audioUrl: z.string().url().optional(),
                    }),
                )
                .default([]),
            media: z
                .object({
                    imageUrl: z.string().url().optional(),
                    audioUrl: z.string().url().optional(),
                    videoUrl: z.string().url().optional(),
                })
                .optional(),
        })
        .optional(),
});

const moduleMCQSchema = z.object({
    order: z.number().int().min(1),
    type: z.literal('mcq'),
    name: z.string().trim().min(1).max(200),
    timeLimitMinutes: z.number().int().min(1),
    showCountdown: z.boolean().default(true),
    allowBackNavigation: z.boolean().default(false),
    adaptive: z.boolean().default(true),
    samplingMode: z.enum(['random', 'fixed']).default('random'),
    parts: z.array(partConfigSchema).min(1),
});

const moduleEssaySchema = z.object({
    order: z.number().int().min(1),
    type: z.literal('essay'),
    name: z.string().trim().min(1).max(200),
    timeLimitMinutes: z.number().int().min(1),
    aiModel: z.string().trim().min(1).default('gpt-4o-mini'),
    criteria: z.array(z.string().trim()).min(1),
    wordLimits: z.object({
        low: z.number().int().min(50),
        mid: z.number().int().min(50),
        high: z.number().int().min(50),
    }),
    topicsByLevel: z.object({
        low: z.array(z.string().trim().min(1)),
        mid: z.array(z.string().trim().min(1)),
        high: z.array(z.string().trim().min(1)),
    }),
    promptImageUrl: z.string().trim().url().optional(),
    secureMode: z.object({
        disablePaste: z.boolean().default(true),
        disableSpellcheck: z.boolean().default(true),
    }),
    promptSource: z.enum(['ai_generated', 'library']).default('ai_generated'),
});

const speakingPartsSchema = z.object({
    warmupMinutes: z.number().min(0).default(1),
    part1: z.object({
        minutes: z.number().min(1),
        questionsRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
        topics: z.array(z.string().trim()),
    }),
    part2: z.object({
        minutes: z.number().min(1),
        prepSeconds: z.number().int().min(0),
        cueCards: z.array(
            z.object({
                level: z.enum(['low', 'mid', 'high']),
                text: z.string().trim().min(1),
            }),
        ),
    }),
    part3: z.object({
        minutes: z.number().min(1),
        questionsRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
        topics: z.array(z.string().trim()).default([]),
    }),
});

const moduleSpeakingSchema = z.object({
    order: z.number().int().min(1),
    type: z.literal('speaking'),
    name: z.string().trim().min(1).max(200),
    totalMinutes: z.number().int().min(1),
    conversationModel: z.string().trim().min(1).default('gpt-4o-mini'),
    ttsModel: z.string().trim().min(1).default('tts-1'),
    ttsVoice: z.string().trim().min(1).default('alloy'),
    gradingModel: z.string().trim().min(1).default('gpt-4o-mini'),
    speechAnalytics: z.string().trim().min(1).default('azure-ai-speech'),
    silenceThresholdSeconds: z.number().int().min(1).max(30).default(5),
    criteria: z.array(z.string().trim()).min(1),
    parts: speakingPartsSchema,
});

const moduleSchema = z.discriminatedUnion('type', [
    moduleMCQSchema,
    moduleEssaySchema,
    moduleSpeakingSchema,
]);

const cefrMappingSchema = z.object({
    weights: z
        .object({
            mcq: z.number().min(0).max(1),
            writing: z.number().min(0).max(1),
            speaking: z.number().min(0).max(1),
        })
        .refine(
            (w) => Math.abs(w.mcq + w.writing + w.speaking - 1) < 0.001,
            { message: 'Tổng trọng số phải bằng 1.0' },
        ),
    thresholds: z
        .array(
            z.object({
                level: cefrLevelEnum,
                mcqMin: z.number().min(0).max(1),
                mcqMax: z.number().min(0).max(1),
                writingMin: z.number().min(0).max(1).default(0),
                writingMax: z.number().min(0).max(1).default(1),
                speakingMin: z.number().min(0).max(1).default(0),
                speakingMax: z.number().min(0).max(1).default(1),
            }),
        )
        .min(2),
});

const settingsSchema = z.object({
    targetAudience: z
        .array(z.enum(['new_user', 'retake', 'invitation']))
        .min(1, 'Phải chọn ít nhất một đối tượng áp dụng'),
    allowRetake: z.boolean().default(false),
    retakeCooldownDays: z.number().int().min(0).default(30),
});

// ─── 1. GET /placement-tests ──────────────────────────────────────────────────

export const getPlacementTestsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(5).max(100).default(20),
        search: z.string().trim().max(200).optional(),
        language: z.string().trim().max(10).optional(),
        status: placementStatusEnum.optional(),
    }),
});

// ─── 2. GET /placement-tests/:id ─────────────────────────────────────────────

export const getPlacementTestByIdSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

// ─── 3. POST /placement-tests ─────────────────────────────────────────────────

export const createPlacementTestSchema = z.object({
    body: z.object({
        languageId: mongoIdSchema,
        language: z.string().trim().min(2).max(10),
        name: z.string().trim().min(1).max(200),
        standard: z.string().trim().min(1).max(100),
        outputFramework: z.string().trim().min(1).max(50).default('CEFR'),
        description: z.string().trim().max(2000).optional(),
        settings: settingsSchema.default({
            targetAudience: ['new_user'],
            allowRetake: false,
            retakeCooldownDays: 30,
        }),
        modules: z.array(moduleSchema).default([]),
        cefrMapping: cefrMappingSchema.optional(),
    }),
});

// ─── 4. PUT /placement-tests/:id ──────────────────────────────────────────────

export const updatePlacementTestSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: z.object({
        name: z.string().trim().min(1).max(200).optional(),
        standard: z.string().trim().min(1).max(100).optional(),
        outputFramework: z.string().trim().min(1).max(50).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        settings: settingsSchema.optional(),
        modules: z.array(moduleSchema).optional(),
        cefrMapping: cefrMappingSchema.optional(),
    }),
});

// ─── 5. PATCH /placement-tests/:id/status ────────────────────────────────────

export const updatePlacementTestStatusSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: z.object({
        status: z.enum(['active', 'paused', 'archived']),
    }),
});

// ─── 6. GET /placement-tests/:id/versions ────────────────────────────────────

export const getVersionHistorySchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

// ─── 7. POST /placement-tests/:id/rollback/:version ──────────────────────────

export const rollbackSchema = z.object({
    params: z.object({
        id: mongoIdSchema,
        version: z.coerce.number().int().positive(),
    }),
});

// ─── 8. GET /placement-tests/:id/pool-validation ─────────────────────────────

export const poolValidationSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
});

// ─── 9. GET /placement-tests/:id/analytics ───────────────────────────────────

export const analyticsSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    query: z.object({
        range: z.enum(['7d', '30d', '90d', 'all', 'custom']).default('7d'),
        from: z.string().optional(),
        to: z.string().optional(),
    }),
});

// ─── 10. POST /placement-tests/ai/parse-mcq-part3 ───────────────────────────

export const parseMcqPart3ImportSchema = z.object({
    body: z.object({
        rawText: z.string().trim().min(20).max(200000),
        part: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]).default(3),
    }),
});

// ─── 11. POST /placement-tests/:id/push-to-question-bank ───────────────────────

export const pushToQuestionBankSchema = z.object({
    params: z.object({ id: mongoIdSchema }),
    body: z.object({
        status: z.enum(['draft', 'published']).default('published'),
    }),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type PushToQuestionBankBody = z.infer<typeof pushToQuestionBankSchema>['body'];

export type GetPlacementTestsQuery = z.infer<typeof getPlacementTestsSchema>['query'];
export type CreatePlacementTestBody = z.infer<typeof createPlacementTestSchema>['body'];
export type UpdatePlacementTestBody = z.infer<typeof updatePlacementTestSchema>['body'];
export type UpdatePlacementTestStatusBody = z.infer<typeof updatePlacementTestStatusSchema>['body'];
export type RollbackParams = z.infer<typeof rollbackSchema>['params'];
export type AnalyticsQuery = z.infer<typeof analyticsSchema>['query'];
export type ParseMcqPart3ImportBody = z.infer<typeof parseMcqPart3ImportSchema>['body'];

export { moduleTypeEnum, placementStatusEnum, cefrLevelEnum };
