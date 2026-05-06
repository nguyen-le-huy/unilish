import mongoose from 'mongoose';
import { connectDB } from '../config/database.mongo.js';
import { env } from '../config/env.js';
import { ShadowingVideo } from '../models/mongo/shadowing-video.model.js';
import { shadowingVideoRepo } from '../repositories/mongo/shadowing-video.mongo.repository.js';
import { DeepgramService } from '../services/deepgram.service.js';
import { YtDlpService } from '../services/yt-dlp.service.js';
import { logger } from '../utils/logger.js';

interface ShadowingVideoRecord {
    videoId: string;
    title?: string;
    thumbnailUrl?: string;
    status?: string;
}

const parseFlagValue = (flag: string): string | null => {
    const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
    if (!match) {
        return null;
    }

    return match.split('=').slice(1).join('=') || null;
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const toPositiveInt = (value: string | null, fallback: number): number => {
    if (!value) {
        return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
};

const buildFilter = (status: string | null): Record<string, unknown> => {
    if (!status || status === 'all') {
        return {};
    }

    return { status };
};

const mapConcurrent = async <T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const worker = async (): Promise<void> => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await fn(items[index]!);
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
};

const reprocessVideo = async (video: ShadowingVideoRecord): Promise<void> => {
    const videoId = video.videoId;
    if (!videoId) {
        return;
    }

    logger.info('Reprocessing shadowing video', { videoId, status: video.status ?? 'unknown' });

    const audioPath = await YtDlpService.extractAudio(videoId);
    const cues = await DeepgramService.transcribe(audioPath);
    const durationSeconds = cues.length > 0
        ? Math.ceil(cues[cues.length - 1]!.endMs / 1000)
        : 0;

    const title = video.title ?? `Video ${videoId}`;
    const thumbnailUrl = video.thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    await shadowingVideoRepo.markAsReady(videoId, {
        title,
        thumbnailUrl,
        durationSeconds,
        cues,
    });

    logger.info('Reprocess complete', { videoId, cueCount: cues.length });
};

const run = async (): Promise<void> => {
    const statusFlag = parseFlagValue('--status');
    const concurrency = toPositiveInt(parseFlagValue('--concurrency'), Math.min(2, env.AI_ANALYSIS_CONCURRENCY));
    const isDryRun = hasFlag('--dry-run');

    try {
        await connectDB();
        logger.info('Connected to MongoDB');

        const filter = buildFilter(statusFlag);
        const videos = await ShadowingVideo
            .find(filter)
            .select('videoId title thumbnailUrl status')
            .lean()
            .exec() as ShadowingVideoRecord[];

        logger.info('Shadowing videos loaded', {
            total: videos.length,
            status: statusFlag ?? 'all',
            concurrency,
            dryRun: isDryRun,
        });

        if (videos.length === 0) {
            return;
        }

        if (isDryRun) {
            return;
        }

        await mapConcurrent(videos, async (video) => {
            try {
                await reprocessVideo(video);
            } catch (error) {
                logger.error('Reprocess failed for video', {
                    videoId: video.videoId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }, concurrency);
    } catch (error) {
        logger.error('Shadowing reprocess script failed', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
