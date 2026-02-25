import { Queue } from 'bullmq';
import { env } from '../../config/env.js';
import type { TranscriptLine } from '../../types/lesson-content.types.js';

// ─── Job Payload ──────────────────────────────────────────────────────────────

export interface ListeningMixSyncJobPayload {
    lessonId: string;
    transcript: TranscriptLine[];
    accent: 'en-US' | 'en-UK' | 'mixed';
    noiseLevel: 'none' | 'low' | 'medium' | 'high';
    /** Optional override: { speakerName → elevenLabsVoiceId } */
    speakerVoiceMap: Record<string, string>;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export const listeningMixSyncQueue = new Queue<ListeningMixSyncJobPayload>(
    'listening-mix-sync',
    {
        connection: { url: env.REDIS_URI || 'redis://localhost:6379' },
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 10_000 },
            removeOnComplete: { count: 30 },
            removeOnFail: { count: 50 },
        },
    },
);
