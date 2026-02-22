import { Worker, type Job } from 'bullmq';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { LessonMongoRepository } from '../../repositories/mongo/lesson.mongo.repository.js';
import { Language } from '../../models/mongo/language.model.js';
import type { TTSJobPayload } from '../queues/tts.queue.js';

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

const lessonRepo = new LessonMongoRepository();

// ─── R2 Buffer Upload ─────────────────────────────────────────────────────────

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

    // Return the R2 object key only — frontend routes through /api/audio proxy
    return key;
}

// ─── Worker Processor ─────────────────────────────────────────────────────────

async function processTTSJob(job: Job<TTSJobPayload>): Promise<void> {
    const { lessonId, languageId, items } = job.data;

    logger.info(`[TTS Worker] Starting job ${job.id} — lesson: ${lessonId}, items: ${items.length}`);

    // 1. Fetch language TTS config
    const language = await Language.findById(languageId)
        .select('ttsConfig')
        .lean()
        .exec();

    if (!language) {
        throw new Error(`Language ${languageId} not found`);
    }

    const voiceId = (language.ttsConfig?.voiceId ?? 'alloy') as OpenAI.Audio.SpeechCreateParams['voice'];
    const speed = language.ttsConfig?.speed ?? 1.0;

    // 2. Set generation status to GENERATING_AUDIO
    await lessonRepo.updateVocabGenerationStatus(lessonId, 'GENERATING_AUDIO');

    // 3. Process each item
    let processedCount = 0;
    for (const item of items) {
        const { itemId, word, sentence } = item;
        const sanitizedWord = word.replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '_').replace(/\s+/g, '-');
        const keyPrefix = `audio/vocab/${lessonId}/${itemId}`;

        // 3a. Word audio
        try {
            const wordSpeech = await openaiClient.audio.speech.create({
                model: env.OPENAI_TTS_MODEL,
                voice: voiceId,
                input: word,
                speed,
            });
            const wordBuffer = Buffer.from(await wordSpeech.arrayBuffer());
            const wordKey = `${keyPrefix}-${sanitizedWord}-word.mp3`;
            const wordUrl = await uploadAudioBuffer(wordBuffer, wordKey);
            await lessonRepo.updateVocabItemAudio(lessonId, itemId, 'word', wordUrl);
        } catch (err) {
            logger.error(`[TTS Worker] Failed word audio for item ${itemId}:`, err);
        }

        // 3b. Sentence audio
        try {
            const sentenceSpeech = await openaiClient.audio.speech.create({
                model: env.OPENAI_TTS_MODEL,
                voice: voiceId,
                input: sentence,
                speed,
            });
            const sentenceBuffer = Buffer.from(await sentenceSpeech.arrayBuffer());
            const sentenceKey = `${keyPrefix}-${sanitizedWord}-sentence.mp3`;
            const sentenceUrl = await uploadAudioBuffer(sentenceBuffer, sentenceKey);
            await lessonRepo.updateVocabItemAudio(lessonId, itemId, 'sentence', sentenceUrl);
        } catch (err) {
            logger.error(`[TTS Worker] Failed sentence audio for item ${itemId}:`, err);
        }

        processedCount++;
        await job.updateProgress(Math.round((processedCount / items.length) * 100));
    }

    // 4. Mark generation DONE
    await lessonRepo.updateVocabGenerationStatus(lessonId, 'DONE');

    logger.info(`[TTS Worker] Completed job ${job.id} — lesson: ${lessonId}`);
}

// ─── Worker Instance ──────────────────────────────────────────────────────────

export const ttsWorker = new Worker<TTSJobPayload>('tts-generation', processTTSJob, {
    connection: {
        url: env.REDIS_URI || 'redis://localhost:6379',
    },
    concurrency: 2,
});

ttsWorker.on('completed', (job) => {
    logger.info(`[TTS Worker] Job ${job.id} completed`);
});

ttsWorker.on('failed', (job, err) => {
    logger.error(`[TTS Worker] Job ${job?.id} failed:`, err);
});
