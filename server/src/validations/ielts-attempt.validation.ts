import { z } from 'zod';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

// ─── Start attempt ───────────────────────────────────────────────────────────

export const startAttemptSchema = z.object({
    params: z.object({
        testId: mongoIdSchema,
    }),
    body: z.object({
        clientStartedAt: z.string().datetime().optional(),
    }),
});

// ─── Get attempt ─────────────────────────────────────────────────────────────

export const getAttemptSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
});

// ─── Save draft (autosave) ───────────────────────────────────────────────────

const listeningDraftSchema = z.object({
    skill: z.literal('listening'),
    revision: z.number().int().min(0),
    answers: z.record(z.string(), z.string().trim()).optional().default({}),
    flaggedItemIds: z.array(z.string().trim()).optional().default([]),
});

const readingDraftSchema = z.object({
    skill: z.literal('reading'),
    revision: z.number().int().min(0),
    answers: z
        .record(z.string(), z.enum(['TRUE', 'FALSE', 'NOT_GIVEN']))
        .optional()
        .default({}),
    flaggedItemIds: z.array(z.string().trim()).optional().default([]),
});

const writingDraftSchema = z.object({
    skill: z.literal('writing'),
    revision: z.number().int().min(0),
    essay: z.string().optional().default(''),
});

const speakingDraftSchema = z.object({
    skill: z.literal('speaking'),
    revision: z.number().int().min(0),
    transcriptSegments: z
        .array(
            z.object({
                id: z.string().trim().min(1),
                speaker: z.enum(['learner', 'coach']),
                text: z.string().trim(),
                startedAtMs: z.number().int().min(0),
                endedAtMs: z.number().int().min(0).optional(),
            }),
        )
        .optional()
        .default([]),
    audioAssetIds: z.array(z.string().trim()).optional().default([]),
});

export const saveDraftSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
    body: z.discriminatedUnion('skill', [
        listeningDraftSchema,
        readingDraftSchema,
        writingDraftSchema,
        speakingDraftSchema,
    ]),
});

// ─── Submit attempt ──────────────────────────────────────────────────────────

export const submitAttemptSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
    body: z.object({
        revision: z.number().int().min(0),
    }),
});

// ─── Abandon attempt ─────────────────────────────────────────────────────────

export const abandonAttemptSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
    body: z.object({}).optional(),
});

// ─── Get result ──────────────────────────────────────────────────────────────

export const getAttemptResultSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type StartAttemptBody = z.infer<typeof startAttemptSchema>['body'];
export type SaveDraftBody = z.infer<typeof saveDraftSchema>['body'];
export type SubmitAttemptBody = z.infer<typeof submitAttemptSchema>['body'];
