import mongoose from 'mongoose';
import { connectDB } from '../config/database.mongo.js';
import { connectPinecone, disconnectPinecone } from '../config/database.pinecone.js';
import { CourseSeries } from '../models/mongo/course-series.model.js';
import { CourseSeriesVectorRepository } from '../repositories/vector/course-series.vector.repository.js';
import { embeddingService } from '../services/embedding.service.js';
import { logger } from '../utils/logger.js';

const UPSERT_BATCH_SIZE = 100;

interface CourseSeriesSyncDoc {
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

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
};

const formatError = (error: unknown) => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return { raw: error };
};

const run = async (): Promise<void> => {
    const vectorRepo = new CourseSeriesVectorRepository();

    try {
        await connectDB();
        await connectPinecone();

        logger.info('Starting course-series vector sync...');

        const activeSeries = await CourseSeries.find({ isActive: true })
            .select('_id languageId learningGoalId isActive title slug description thumbnailUrl totalCourses')
            .lean<CourseSeriesSyncDoc[]>()
            .exec();

        if (activeSeries.length === 0) {
            logger.info('No active course series found. Nothing to sync.');
            return;
        }

        const texts = activeSeries.map((series) => embeddingService.buildSeriesEmbedText(series));
        const embeddings = await embeddingService.embedBatch(texts);

        if (embeddings.length !== activeSeries.length) {
            throw new Error(
                `Embedding count mismatch. Expected ${activeSeries.length}, received ${embeddings.length}.`,
            );
        }

        const seriesWithEmbeddings = activeSeries.map((series, index) => {
            const embedding = embeddings[index];
            if (!embedding) {
                throw new Error(`Missing embedding at index ${index}`);
            }

            return { series, embedding };
        });

        const batches = chunkArray(seriesWithEmbeddings, UPSERT_BATCH_SIZE);
        let totalUpserted = 0;

        for (const [index, batch] of batches.entries()) {
            await vectorRepo.upsertBatch(batch);
            totalUpserted += batch.length;
            logger.info('Course-series vector batch synced', {
                batch: index + 1,
                totalBatches: batches.length,
                batchSize: batch.length,
                totalUpserted,
            });
        }

        logger.info('✅ Course-series vector sync completed', {
            totalSeries: activeSeries.length,
            totalBatches: batches.length,
            upsertBatchSize: UPSERT_BATCH_SIZE,
        });
    } catch (error) {
        logger.error('❌ Course-series vector sync failed', { error: formatError(error) });
        process.exitCode = 1;
    } finally {
        await Promise.allSettled([
            mongoose.disconnect(),
            disconnectPinecone(),
        ]);
    }
};

void run();
