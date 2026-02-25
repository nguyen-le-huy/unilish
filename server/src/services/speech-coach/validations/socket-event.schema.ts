/**
 * @module socket-event.schema
 * @description Shared Zod base schema enforcing mandatory correlation fields
 * present on every inbound Socket event payload.
 */

import { z } from 'zod';

export const speakingEventBaseSchema = z.object({
    sessionId: z.string().uuid({ message: 'sessionId must be a valid UUID' }),
    userId: z.string().min(1, 'userId is required'),
    lessonId: z.string().min(1, 'lessonId is required'),
    traceId: z.string().min(1, 'traceId is required'),
    timestamp: z.number().int().positive('timestamp must be a positive Unix ms value'),
    contractVersion: z.number().int().min(1, 'contractVersion must be >= 1'),
});

export type SpeakingEventBaseInput = z.infer<typeof speakingEventBaseSchema>;
