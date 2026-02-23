import { Worker, type Job } from 'bullmq';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { readingRepo } from '../../repositories/mongo/reading.mongo.repository.js';
import type { ReadingTTSJobPayload } from '../queues/reading-tts.queue.js';

// ─── Infrastructure Clients ───────────────────────────────────────────────────

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    },
});

// ─── R2 Upload ────────────────────────────────────────────────────────────────

async function uploadAudioBuffer(buffer: Buffer, key: string): Promise<string> {
    const upload = new Upload({
        client: r2Client,
        params: {
            Bucket: env.R2_BUCKET_NAME || '',
            Key: key,
            Body: buffer,
            ContentType: 'audio/mpeg',
        },
    });

    await upload.done();
    return key;
}

// ─── Worker Processor ─────────────────────────────────────────────────────────

async function processReadingTTSJob(job: Job<ReadingTTSJobPayload>): Promise<void> {
    const { lessonId, text, voiceId = 'alloy', speed = 1.0 } = job.data;

    logger.info(`[ReadingTTSWorker] Starting job ${job.id} — lesson: ${lessonId}, chars: ${text.length}`);

    // 1. Signal in-progress
    await readingRepo.setGenerationStatus(lessonId, 'GENERATING_AUDIO');

    // 2. Synthesize via OpenAI TTS
    const speech = await openaiClient.audio.speech.create({
        model: env.OPENAI_TTS_MODEL,
        voice: voiceId as OpenAI.Audio.SpeechCreateParams['voice'],
        input: text,
        speed,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    // 3. Upload to R2 — key: audio/reading/<lessonId>/narration.mp3
    const key = `audio/reading/${lessonId}/narration.mp3`;
    const audioUrl = await uploadAudioBuffer(buffer, key);

    // 4. Patch lesson content with the audio URL
    await readingRepo.setMediaAudioUrl(lessonId, audioUrl);

    logger.info(`[ReadingTTSWorker] Job ${job.id} complete — uploaded: ${key}`);
}

// ─── Worker Instance ──────────────────────────────────────────────────────────

export const readingTtsWorker = new Worker<ReadingTTSJobPayload>(
    'reading-tts-generation',
    processReadingTTSJob,
    {
        connection: { url: env.REDIS_URI || 'redis://localhost:6379' },
        concurrency: 2,
    },
);

readingTtsWorker.on('failed', (job, err) => {
    logger.error(`[ReadingTTSWorker] Job ${job?.id} failed`, { error: err.message, lessonId: job?.data.lessonId });
    // Best-effort: mark lesson as ERROR so admin can retry
    if (job?.data.lessonId) {
        readingRepo.setGenerationStatus(job.data.lessonId, 'ERROR').catch(() => undefined);
    }
});
