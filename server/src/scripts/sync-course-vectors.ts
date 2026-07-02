import mongoose from 'mongoose';
import { connectDB } from '../config/database.mongo.js';
import { connectPinecone, disconnectPinecone } from '../config/database.pinecone.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseVectorRepository } from '../repositories/vector/course.vector.repository.js';
import { embeddingService } from '../services/embedding.service.js';
import { logger } from '../utils/logger.js';

const UPSERT_BATCH_SIZE = 100;

interface CourseSyncDoc {
    _id: string | { toString(): string };
    languageId: string | { toString(): string };
    learningGoalId: string | { toString(): string };
    isActive: boolean;
    name: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    level: string;
    totalUnits: number;
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
    const vectorRepo = new CourseVectorRepository();

    try {
        await connectDB();
        await connectPinecone();

        logger.info('Starting course vector sync...');

        const activeCourses = await Course.find({ isActive: true })
            .select('_id languageId learningGoalId isActive name slug description thumbnailUrl level totalUnits')
            .lean<CourseSyncDoc[]>()
            .exec();

        if (activeCourses.length === 0) {
            logger.info('No active courses found. Nothing to sync.');
            return;
        }

        const texts = activeCourses.map((course) =>
            embeddingService.buildCourseEmbedText({
                name: course.name,
                level: course.level,
                description: course.description ?? null,
            }),
        );
        const embeddings = await embeddingService.embedBatch(texts);

        if (embeddings.length !== activeCourses.length) {
            throw new Error(
                `Embedding count mismatch. Expected ${activeCourses.length}, received ${embeddings.length}.`,
            );
        }

        const coursesWithEmbeddings = activeCourses.map((course, index) => {
            const embedding = embeddings[index];
            if (!embedding) {
                throw new Error(`Missing embedding at index ${index}`);
            }

            return { course, embedding };
        });

        const batches = chunkArray(coursesWithEmbeddings, UPSERT_BATCH_SIZE);
        let totalUpserted = 0;

        for (const [index, batch] of batches.entries()) {
            await vectorRepo.upsertBatch(batch);
            totalUpserted += batch.length;
            logger.info('Course vector batch synced', {
                batch: index + 1,
                totalBatches: batches.length,
                batchSize: batch.length,
                totalUpserted,
            });
        }

        logger.info('✅ Course vector sync completed', {
            totalCourses: activeCourses.length,
            totalBatches: batches.length,
            upsertBatchSize: UPSERT_BATCH_SIZE,
        });
    } catch (error) {
        logger.error('❌ Course vector sync failed', { error: formatError(error) });
        process.exitCode = 1;
    } finally {
        await Promise.allSettled([
            mongoose.disconnect(),
            disconnectPinecone(),
        ]);
    }
};

void run();
