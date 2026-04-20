import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

export const AIConfigSchema = z.object({
    roleName: z.string().min(1, 'Vui lòng nhập tên nhân vật'),
    voiceId: z.enum(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar']).default('marin'),
    firstMessage: z.string().min(1, 'Lời chào mở đầu không được để trống'),
    systemInstruction: z.string().min(1, 'System instruction không được trống'),
});

export const KeywordConceptMapSchema = z.object({
    word: z.string().min(1),
    conceptId: z.string().min(1, 'Vui lòng map Concept ID'),
});

export const GradingConfigSchema = z.object({
    referenceText: z.string().nullable(),
    gradingSystem: z.enum(['FivePoint', 'HundredMark']).default('FivePoint'),
    granularity: z.enum(['Phoneme', 'Word', 'Syllable']).default('Phoneme'),
    enableProsodyAssessment: z.boolean().default(true),
    requiredKeywords: z.array(z.string()).default([]),
    keywordConceptMap: z.array(KeywordConceptMapSchema).default([]),
});

export const SpeakingHintSchema = z.object({
    vi: z.string().min(1, 'Không được để trống'),
    en: z.string().min(1, 'Không được để trống'),
    structure: z.string().optional(),
});

// ─── GET /:lessonId/speaking/content ────────────────────────────────────────

export const getSpeakingContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type GetSpeakingContentParams = z.infer<typeof getSpeakingContentSchema>['params'];

// ─── GET /:lessonId/speaking/session ───────────────────────────────────────

export const getSpeakingRealtimeSessionSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type GetSpeakingRealtimeSessionParams = z.infer<typeof getSpeakingRealtimeSessionSchema>['params'];

// ─── PUT /:lessonId/speaking/content ────────────────────────────────────────

export const saveSpeakingContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        missionTitle: z.string().min(1).optional(),
        missionDescription: z.string().min(1).optional(),
        aiConfig: AIConfigSchema.optional(),
        gradingConfig: GradingConfigSchema.optional(),
        hints: z.array(SpeakingHintSchema).optional(),
    }),
});

export type SaveSpeakingContentBody = z.infer<typeof saveSpeakingContentSchema>['body'];

// ─── POST /:lessonId/speaking/generate-mission ───────────────────────────────

export const generateSpeakingMissionSchema = z.object({
    body: z.object({
        topic: z.string().min(1, 'Topic is required'),
        context: z.string().min(1, 'Context is required'),
    }),
    params: z.object({
        lessonId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lesson ID'),
    }),
});

export type GenerateSpeakingMissionBody = z.infer<typeof generateSpeakingMissionSchema>['body'];

// ─── POST /:lessonId/speaking/test-coach ────────────────────────────────────

export const testSpeakingCoachSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        userMessage: z.string().min(1, 'userMessage is required'),
    }),
});

export type TestSpeakingCoachBody = z.infer<typeof testSpeakingCoachSchema>['body'];
