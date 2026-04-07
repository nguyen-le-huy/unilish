import { Queue } from 'bullmq';
import { env } from '../../config/env.js';

export interface SpeakingGradingJobPayload {
    sessionId: string;
    speakingAttemptId: string;
    transcripts: string[];
    pronunciationData: Array<Record<string, unknown>>;
}

export const speakingGradingQueue = new Queue<SpeakingGradingJobPayload>('speaking-grading', {
    connection: {
        url: env.REDIS_URI || 'redis://localhost:6379',
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2_000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
});
