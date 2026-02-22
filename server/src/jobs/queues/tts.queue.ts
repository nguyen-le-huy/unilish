import { Queue } from 'bullmq';
import { env } from '../../config/env.js';

// ─── Job Payload ──────────────────────────────────────────────────────────────

export interface TTSJobItem {
    itemId: string;
    word: string;
    sentence: string;
}

export interface TTSJobPayload {
    lessonId: string;
    languageId: string;
    items: TTSJobItem[];
}

// ─── Queue ────────────────────────────────────────────────────────────────────

/**
 * BullMQ Queue for Text-to-Speech audio generation jobs.
 * Uses the REDIS_URI from env to avoid coupling to any specific client.
 */
export const ttsQueue = new Queue<TTSJobPayload>('tts-generation', {
    connection: {
        url: env.REDIS_URI || 'redis://localhost:6379',
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2_000,
        },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
});
