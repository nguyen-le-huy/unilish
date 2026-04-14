import mongoose from 'mongoose';
import { connectDB } from '../config/database.mongo.js';
import { connectPinecone, disconnectPinecone } from '../config/database.pinecone.js';
import { env } from '../config/env.js';
import { CourseSeries } from '../models/mongo/course-series.model.js';
import { CourseSeriesVectorRepository } from '../repositories/vector/course-series.vector.repository.js';
import { aiAnalysisService, createSeriesContentHash } from '../services/ai-analysis.service.js';
import { embeddingService } from '../services/embedding.service.js';
import { logger } from '../utils/logger.js';

const UPSERT_BATCH_SIZE = 100;
const DEFAULT_DELAY_MS = 500;

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
    updatedAt: Date;
    aiCache?: {
        analyzedAt?: Date | string | null;
        contentHash?: string | null;
        analysis?: unknown;
    } | null;
}

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
};

const isSeriesStale = (series: CourseSeriesSyncDoc): boolean => {
    const contentHash = createSeriesContentHash(series.title, series.description ?? '');
    const cached = series.aiCache;

    if (!cached || !cached.analysis || !cached.analyzedAt || !cached.contentHash) {
        return true;
    }

    if (cached.contentHash !== contentHash) {
        return true;
    }

    const analyzedAt = new Date(cached.analyzedAt);
    if (Number.isNaN(analyzedAt.getTime())) {
        return true;
    }

    return new Date(series.updatedAt).getTime() > analyzedAt.getTime();
};

const run = async (): Promise<void> => {
    const vectorRepo = new CourseSeriesVectorRepository();
    const isDryRun = process.argv.includes('--dry-run');

    try {
        await connectDB();
        await connectPinecone();

        logger.info('Starting AI course-series vector sync...', {
            dryRun: isDryRun,
            concurrency: env.AI_ANALYSIS_CONCURRENCY,
        });

        const activeSeries = await CourseSeries.find({ isActive: true })
            .select('_id languageId learningGoalId isActive title slug description thumbnailUrl totalCourses updatedAt aiCache')
            .lean<CourseSeriesSyncDoc[]>()
            .exec();

        if (activeSeries.length === 0) {
            logger.info('No active course series found. Nothing to sync.');
            return;
        }

        const staleSeries = activeSeries.filter(isSeriesStale);
        if (staleSeries.length === 0) {
            logger.info('All active course series already have fresh AI analysis. Nothing to sync.');
            return;
        }

        logger.info('Running AI analysis for stale course series', {
            totalActive: activeSeries.length,
            staleCount: staleSeries.length,
        });

        const analyses = await aiAnalysisService.analyzeBatch(
            staleSeries.map((series) => ({
                title: series.title,
                description: series.description ?? '',
            })),
            {
                concurrency: env.AI_ANALYSIS_CONCURRENCY,
                delayMs: DEFAULT_DELAY_MS,
            },
        );

        const enrichedSeries = staleSeries.map((series, index) => ({
            series,
            aiAnalysis: analyses[index] ?? null,
        }));

        if (isDryRun) {
            const aiSuccessCount = enrichedSeries.filter((item) => item.aiAnalysis !== null).length;
            logger.info('Dry-run complete. No Pinecone upsert performed.', {
                staleCount: staleSeries.length,
                aiSuccessCount,
                aiFallbackCount: staleSeries.length - aiSuccessCount,
            });
            return;
        }

        const texts = enrichedSeries.map(({ series, aiAnalysis }) =>
            embeddingService.buildEnrichedEmbedText(series, aiAnalysis),
        );
        const embeddings = await embeddingService.embedBatch(texts);

        if (embeddings.length !== enrichedSeries.length) {
            throw new Error(
                `Embedding count mismatch. Expected ${enrichedSeries.length}, received ${embeddings.length}.`,
            );
        }

        const itemsWithEmbeddings = enrichedSeries.map((item, index) => {
            const embedding = embeddings[index];
            if (!embedding) {
                throw new Error(`Missing embedding at index ${index}`);
            }

            return {
                ...item,
                embedding,
            };
        });

        const batches = chunkArray(itemsWithEmbeddings, UPSERT_BATCH_SIZE);
        let totalUpserted = 0;

        for (const [index, batch] of batches.entries()) {
            await vectorRepo.upsertEnrichedBatch(batch.map((item) => ({
                series: item.series,
                embedding: item.embedding,
                aiAnalysis: item.aiAnalysis,
            })));

            totalUpserted += batch.length;
            logger.info('AI course-series vector batch synced', {
                batch: index + 1,
                totalBatches: batches.length,
                batchSize: batch.length,
                totalUpserted,
            });
        }

        const aiEnrichedItems = itemsWithEmbeddings.filter(
            (item): item is typeof item & { aiAnalysis: NonNullable<typeof item.aiAnalysis> } => item.aiAnalysis !== null,
        );

        const aiCacheOps = aiEnrichedItems.map((item) => ({
                updateOne: {
                    filter: { _id: item.series._id },
                    update: {
                        $set: {
                            aiCache: {
                                analysis: item.aiAnalysis,
                                analyzedAt: new Date(),
                                contentHash: createSeriesContentHash(item.series.title, item.series.description ?? ''),
                            },
                        },
                    },
                },
            }));

        if (aiCacheOps.length > 0) {
            await CourseSeries.bulkWrite(aiCacheOps);
        }

        logger.info('✅ AI course-series vector sync completed', {
            totalActive: activeSeries.length,
            staleCount: staleSeries.length,
            totalUpserted,
            aiCacheUpdated: aiCacheOps.length,
            aiFallbackCount: staleSeries.length - aiEnrichedItems.length,
        });
    } catch (error) {
        logger.error('❌ AI course-series vector sync failed', {
            error: error instanceof Error
                ? { name: error.name, message: error.message, stack: error.stack }
                : String(error),
        });
        process.exitCode = 1;
    } finally {
        await Promise.allSettled([
            mongoose.disconnect(),
            disconnectPinecone(),
        ]);
    }
};

void run();
