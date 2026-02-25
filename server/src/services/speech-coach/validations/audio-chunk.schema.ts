/**
 * @module audio-chunk.schema
 * @description Zod v4 schema for the `speaking.audio.chunk` inbound event payload.
 */

import { z } from 'zod';
import { speakingEventBaseSchema } from './socket-event.schema.js';

export const audioChunkSchema = speakingEventBaseSchema.extend({
    sequenceNumber: z
        .number()
        .int()
        .nonnegative('sequenceNumber must be a non-negative integer'),
    audioData: z.string().min(1, 'audioData must be a non-empty base64 string'),
    durationMs: z
        .number()
        .int()
        .positive('durationMs must be a positive integer')
        .max(60_000, 'durationMs must not exceed 60 seconds per chunk'),
    isFinalChunk: z.boolean(),
});

export type AudioChunkInput = z.infer<typeof audioChunkSchema>;
