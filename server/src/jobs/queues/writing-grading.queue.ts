import { Queue } from 'bullmq';
import { env } from '../../config/env.js';

export interface WritingGradingJobPayload {
    sessionId: string;
    writingAttemptId: string;
    essay: string;
    promptText: string;
    criteria: Array<'TR' | 'CC' | 'LR' | 'GRA'>;
}

export const writingGradingQueue = new Queue<WritingGradingJobPayload>('writing-grading', {
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
