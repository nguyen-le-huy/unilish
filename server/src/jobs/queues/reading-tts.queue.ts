import { Queue } from 'bullmq';
import { env } from '../../config/env.js';

// ─── Job Payload ──────────────────────────────────────────────────────────────

export interface ReadingTTSJobPayload {
    lessonId: string;
    text: string;           // Plain-text (HTML already stripped)
    voiceId?: string;       // Override — falls back to Language.ttsConfig.voiceId
    speed?: number;         // Override — falls back to Language.ttsConfig.speed
    type: 'reading_narration';
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export const readingTtsQueue = new Queue<ReadingTTSJobPayload>('reading-tts-generation', {
    connection: {
        url: env.REDIS_URI || 'redis://localhost:6379',
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
});
