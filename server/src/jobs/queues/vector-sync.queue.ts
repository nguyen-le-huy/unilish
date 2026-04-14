import { Queue } from 'bullmq';
import { env } from '../../config/env.js';

export type VectorSyncAction = 'upsert' | 'delete';

export interface VectorSyncJobPayload {
    seriesId: string;
    action: VectorSyncAction;
}

export const vectorSyncQueue = new Queue<VectorSyncJobPayload>('vector-sync', {
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
