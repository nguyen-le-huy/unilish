import { Worker, type Job } from 'bullmq';
import { env } from '../../config/env.js';
import { CourseSeries } from '../../models/mongo/course-series.model.js';
import { CourseSeriesVectorRepository } from '../../repositories/vector/course-series.vector.repository.js';
import { aiAnalysisService, createSeriesContentHash } from '../../services/ai-analysis.service.js';
import { embeddingService } from '../../services/embedding.service.js';
import { logger } from '../../utils/logger.js';
import type { VectorSyncJobPayload } from '../queues/vector-sync.queue.js';

interface CourseSeriesVectorSyncDoc {
    _id: string | { toString(): string };
    languageId: string | { toString(): string };
    learningGoalId: string | { toString(): string };
    isActive: boolean;
    title: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    totalCourses: number;
}

const vectorRepo = new CourseSeriesVectorRepository();

const processVectorSyncJob = async (job: Job<VectorSyncJobPayload>): Promise<void> => {
    const { seriesId, action } = job.data;

    if (action === 'delete') {
        await vectorRepo.deleteSeries(seriesId);
        return;
    }

    const series = await CourseSeries.findById(seriesId)
        .select('_id languageId learningGoalId isActive title slug description thumbnailUrl totalCourses')
        .lean<CourseSeriesVectorSyncDoc | null>()
        .exec();

    if (!series) {
        logger.warn('[Vector Sync Worker] Course series not found', { seriesId, action });
        return;
    }

    let aiAnalysis = null;
    try {
        aiAnalysis = await aiAnalysisService.analyzeCourseSeries(series.title, series.description ?? '');
    } catch (error) {
        logger.warn('[Vector Sync Worker] AI analysis failed. Falling back to base embedding text.', {
            seriesId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    const embedText = embeddingService.buildEnrichedEmbedText(series, aiAnalysis);
    const embedding = await embeddingService.embedText(embedText);
    const analyzedAt = new Date();

    await vectorRepo.upsertEnrichedBatch([{
        series,
        embedding,
        aiAnalysis,
        analyzedAt,
    }]);

    if (aiAnalysis) {
        await CourseSeries.findByIdAndUpdate(seriesId, {
            $set: {
                aiCache: {
                    analysis: aiAnalysis,
                    analyzedAt,
                    contentHash: createSeriesContentHash(series.title, series.description ?? ''),
                },
            },
        }).exec();
    }
};

export const vectorSyncWorker = new Worker<VectorSyncJobPayload>(
    'vector-sync',
    processVectorSyncJob,
    {
        connection: {
            url: env.REDIS_URI || 'redis://localhost:6379',
        },
        concurrency: 2,
    },
);

vectorSyncWorker.on('completed', (job) => {
    logger.info('[Vector Sync Worker] ✅ Job completed', { jobId: job.id });
});

vectorSyncWorker.on('failed', (job, error) => {
    logger.error('[Vector Sync Worker] ❌ Job failed', {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

vectorSyncWorker.on('error', (error) => {
    logger.error('[Vector Sync Worker] ⚠️ Worker error', {
        error: error.message,
        stack: error.stack,
    });
});
