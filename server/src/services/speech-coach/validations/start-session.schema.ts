/**
 * @module start-session.schema
 * @description Zod v4 schema for the `speaking.session.start` inbound event payload.
 */

import { z } from 'zod';
import { speakingEventBaseSchema } from './socket-event.schema.js';

const PERSONA_IDS = ['airport-staff', 'ielts-examiner', 'business-client', 'casual-friend'] as const;

export const startSessionSchema = speakingEventBaseSchema.extend({
    personaId: z.enum(PERSONA_IDS, {
        error: 'personaId must be a valid persona identifier',
    }),
    targetLanguage: z.string().min(2, 'targetLanguage is required (e.g. "en")'),
    nativeLanguage: z.string().min(2, 'nativeLanguage is required (e.g. "vi")'),
    enablePronunciationAssessment: z.boolean(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
