import { Queue } from 'bullmq';
import { env } from '../../config/env.js';

// ─── Job Payload ──────────────────────────────────────────────────────────────

export interface GrammarTTSJobPayload {
    lessonId: string;
    text: string;
    type: 'grammar_story';
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export const grammarTtsQueue = new Queue<GrammarTTSJobPayload>('grammar-tts-generation', {
    connection: {
        url: env.REDIS_URI || 'redis://localhost:6379',
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
});
