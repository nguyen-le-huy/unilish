/**
 * @module end-session.schema
 * @description Zod v4 schemas for the `speaking.session.end` and `speaking.session.recover`
 * inbound event payloads.
 */

import { z } from 'zod';
import { speakingEventBaseSchema } from './socket-event.schema.js';

const END_REASONS = ['user_initiated', 'timeout', 'error'] as const;

export const endSessionSchema = speakingEventBaseSchema.extend({
    reason: z.enum(END_REASONS, {
        error: 'reason must be one of: user_initiated, timeout, error',
    }),
});

export type EndSessionInput = z.infer<typeof endSessionSchema>;

export const recoverSessionSchema = speakingEventBaseSchema.extend({
    lastKnownSequence: z
        .number()
        .int()
        .nonnegative('lastKnownSequence must be a non-negative integer'),
});

export type RecoverSessionInput = z.infer<typeof recoverSessionSchema>;
