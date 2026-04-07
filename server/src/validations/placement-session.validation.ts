import { z } from 'zod';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB id');

export const createPlacementSessionSchema = z.object({
    body: z.object({
        lrAttemptId: mongoIdSchema,
        lrRawScore: z.number().min(0).max(100),
    }),
});

export const placementSessionParamsSchema = z.object({
    params: z.object({
        sessionId: mongoIdSchema,
    }),
});

export const startWritingAttemptSchema = z.object({
    params: z.object({
        sessionId: mongoIdSchema,
    }),
    body: z.object({
        lrScore: z.number().min(0).max(100),
    }),
});

export const submitWritingAttemptSchema = z.object({
    params: z.object({
        sessionId: mongoIdSchema,
    }),
    body: z.object({
        writingAttemptId: z.string().trim().min(1),
        essay: z.string().trim(),
        wordCount: z.number().int().min(0),
        durationSeconds: z.number().int().min(0),
    }),
});

export const uploadSpeakingAudioChunkSchema = z.object({
    params: z.object({
        sessionId: mongoIdSchema,
    }),
    body: z.object({
        speakingAttemptId: z.string().trim().min(1),
        part: z.coerce.number().int().min(1).max(3),
        questionIdx: z.coerce.number().int().min(0),
        transcript: z.string().trim().optional(),
        pronunciationData: z.string().trim().optional(),
    }),
});

export const submitSpeakingAttemptSchema = z.object({
    params: z.object({
        sessionId: mongoIdSchema,
    }),
    body: z.object({
        speakingAttemptId: z.string().trim().min(1),
    }),
});

export const getSpeakingResultSchema = placementSessionParamsSchema;

export type CreatePlacementSessionBody = z.infer<typeof createPlacementSessionSchema>['body'];
export type PlacementSessionParams = z.infer<typeof placementSessionParamsSchema>['params'];
export type StartWritingAttemptBody = z.infer<typeof startWritingAttemptSchema>['body'];
export type SubmitWritingAttemptBody = z.infer<typeof submitWritingAttemptSchema>['body'];
export type UploadSpeakingAudioChunkBody = z.infer<typeof uploadSpeakingAudioChunkSchema>['body'];
export type SubmitSpeakingAttemptBody = z.infer<typeof submitSpeakingAttemptSchema>['body'];
