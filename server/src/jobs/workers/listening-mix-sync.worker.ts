import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { Readable } from 'stream';
import { Worker, type Job } from 'bullmq';
import { ElevenLabsClient } from 'elevenlabs';
import { createClient as createDeepgramClient } from '@deepgram/sdk';
import ffmpeg from 'fluent-ffmpeg';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../../config/env.js';
import { r2Client, listeningAudioKey } from '../../config/r2.js';
import { logger } from '../../utils/logger.js';
import { listeningRepo } from '../../repositories/mongo/listening.mongo.repository.js';
import type { ListeningMixSyncJobPayload } from '../queues/listening-mix-sync.queue.js';
import type { TranscriptLine, AudioWord } from '../../types/lesson-content.types.js';

// ─── Infrastructure Clients ───────────────────────────────────────────────────
// NOTE: ElevenLabs and Deepgram clients are created inside processMixSyncJob
// to avoid throwing at module load time when API keys are not yet configured.

// ─── Noise Level → FFmpeg audio filter ───────────────────────────────────────

const NOISE_VOLUME: Record<string, number> = {
    none: 0,
    low: 0.04,
    medium: 0.1,
    high: 0.2,
};

// ─── Speaker → Default ElevenLabs voices (free-plan safe) ────────────────────
// NOTE:
// - Several ElevenLabs library voices require a paid plan when called via API.
// - Keep fallback voices restricted to free-plan-safe IDs to avoid 402.
const FALLBACK_FREE_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah"
const configuredDefaultVoiceId = env.ELEVENLABS_DEFAULT_VOICE_ID?.trim();
const DEFAULT_VOICES = [configuredDefaultVoiceId, FALLBACK_FREE_VOICE_ID]
    .filter((voiceId): voiceId is string => Boolean(voiceId));

const TTS_CONCURRENCY = 2;
const DEEPGRAM_MAX_RETRIES = 2;
const DEEPGRAM_TIMEOUT_MS = 45_000;
const ELEVENLABS_MAX_RETRIES = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Write a readable Node.js stream to a temp file and return its path. */
async function streamToFile(stream: NodeJS.ReadableStream, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const writer = createWriteStream(filePath);
        stream.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
        stream.on('error', reject);
    });
}

function isRateLimitError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('status code: 429') || message.includes('rate limit');
}

function isPaymentRequiredError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('status code: 402') || message.includes('payment required');
}

/**
 * Synthesise one transcript line via ElevenLabs.
 * Returns the path to the temp MP3 file.
 */
async function synthesiseLine(
    client: ElevenLabsClient,
    text: string,
    voiceId: string,
    outPath: string,
): Promise<void> {
    let lastError: Error | null = null;
    let candidateVoiceId = voiceId;
    let switchedToFallbackVoice = false;

    for (let attempt = 1; attempt <= ELEVENLABS_MAX_RETRIES; attempt += 1) {
        try {
            const audioStream = await client.textToSpeech.convert(candidateVoiceId, {
                text,
                model_id: 'eleven_multilingual_v2',
                output_format: 'mp3_44100_128',
            });

            // ElevenLabs SDK returns a Web ReadableStream (Fetch API), not a Node.js
            // Readable. Convert it so we can pipe it to a file with createWriteStream.
            // Double-cast via unknown to resolve TS type conflict between Web/Node ReadableStream defs.
            const nodeStream = Readable.fromWeb(audioStream as unknown as Parameters<typeof Readable.fromWeb>[0]);
            await streamToFile(nodeStream, outPath);
            return;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown ElevenLabs error');

            // Check if it's a payment/billing error (402)
            if (isPaymentRequiredError(lastError)) {
                if (!switchedToFallbackVoice && candidateVoiceId !== FALLBACK_FREE_VOICE_ID) {
                    switchedToFallbackVoice = true;
                    candidateVoiceId = FALLBACK_FREE_VOICE_ID;
                    logger.warn('[ListeningMixSyncWorker] Voice requires paid plan, switching to fallback free voice', {
                        originalVoiceId: voiceId,
                        fallbackVoiceId: FALLBACK_FREE_VOICE_ID,
                    });
                    continue;
                }

                throw new Error(
                    'ElevenLabs API trả về 402 (Payment Required). ' +
                    'Nguyên nhân thường gặp: voice hiện tại yêu cầu gói trả phí khi gọi qua API, hoặc tài khoản/key không đúng plan. ' +
                    'Hãy kiểm tra voiceId đang dùng và plan/subscription tại https://elevenlabs.io/subscription. ' +
                    `Original error: ${lastError.message}`
                );
            }

            if (!isRateLimitError(lastError)) {
                throw lastError;
            }

            if (attempt >= ELEVENLABS_MAX_RETRIES) {
                break;
            }

            // Exponential backoff for 429: 2s, 4s, 8s, 16s...
            const backoffMs = 2_000 * (2 ** (attempt - 1));
            logger.warn('[ListeningMixSyncWorker] ElevenLabs rate-limited, retrying', {
                attempt,
                backoffMs,
            });
            await sleep(backoffMs);
        }
    }

    throw lastError ?? new Error('ElevenLabs failed after retries');
}

/**
 * Concatenate per-line MP3s into a single WAV using FFmpeg.
 * Returns path to the merged WAV file.
 */
async function concatenateAudio(inputPaths: string[], outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const cmd = ffmpeg();
        for (const p of inputPaths) cmd.input(p);
        cmd
            .on('error', reject)
            .on('end', () => resolve())
            .mergeToFile(outPath, os.tmpdir());
    });
}

/**
 * Mix the dialogue track with optional Gaussian white noise at a given volume.
 * Returns path to the final mixed MP3.
 */
async function mixWithNoise(
    dialoguePath: string,
    noiseLevel: string,
    outPath: string,
): Promise<void> {
    const noiseVol = NOISE_VOLUME[noiseLevel] ?? 0;

    return new Promise((resolve, reject) => {
        const cmd = ffmpeg(dialoguePath);

        if (noiseVol > 0) {
            // Generate white noise and mix it under the dialogue
            cmd
                .input(`aevalsrc=random(0)*2-1:c=stereo:s=44100:d=999`)
                .inputOption('-f lavfi')
                .complexFilter([
                    `[1:a]volume=${noiseVol}[noise]`,
                    `[0:a][noise]amix=inputs=2:duration=first[out]`,
                ])
                .outputOptions(['-map [out]', '-codec:a libmp3lame', '-b:a 128k']);
        } else {
            cmd.audioCodec('libmp3lame').audioBitrate('128k');
        }

        cmd
            .save(outPath)
            .on('error', reject)
            .on('end', () => resolve());
    });
}

/**
 * Upload a file to Cloudflare R2 and return the public URL.
 */
async function uploadToR2(filePath: string, key: string): Promise<void> {
    const upload = new Upload({
        client: r2Client,
        params: {
            Bucket: env.R2_BUCKET_NAME ?? '',
            Key: key,
            Body: createReadStream(filePath),
            ContentType: 'audio/mpeg',
        },
    });
    await upload.done();
}

/** Get media duration in seconds quickly via ffprobe. */
async function getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(audioPath, (error, metadata) => {
            if (error) {
                resolve(0);
                return;
            }
            resolve(Number(metadata.format.duration ?? 0));
        });
    });
}

function getPublicAudioUrlFromR2Key(r2Key: string): string | null {
    const rawDomain = env.R2_PUBLIC_DOMAIN?.trim();
    if (!rawDomain) return null;

    const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!domain) return null;
    return `https://${domain}/${r2Key}`;
}

async function sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${label} timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        }),
    ]);
}

async function runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    concurrency: number,
): Promise<T[]> {
    const safeConcurrency = Math.max(1, Math.min(concurrency, tasks.length || 1));
    const results: T[] = new Array(tasks.length);
    let cursor = 0;

    const workers = Array.from({ length: safeConcurrency }, async () => {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= tasks.length) return;
            results[index] = await tasks[index]!();
        }
    });

    await Promise.all(workers);
    return results;
}

/**
 * Use Deepgram Nova-2 to get word-level timestamps for the complete dialogue.
 * Returns an array of AudioWord, offset-adjusted to absolute time.
 */
async function getWordTimestamps(
    deepgramClient: ReturnType<typeof createDeepgramClient>,
    audioPath: string,
    transcript: TranscriptLine[],
    audioUrl?: string,
): Promise<{ words: AudioWord[]; duration: number }> {
    const options = {
        model: 'nova-2',
        smart_format: true,
        diarize: false,
        punctuate: true,
        utterances: false,
    };

    let lastError: Error | null = null;
    let deepgramWords: Array<{ word?: string; start?: number; end?: number }> = [];
    let duration = 0;

    for (let attempt = 1; attempt <= DEEPGRAM_MAX_RETRIES; attempt += 1) {
        try {
            const response = audioUrl
                ? await withTimeout(
                    deepgramClient.listen.prerecorded.transcribeUrl({ url: audioUrl }, options),
                    DEEPGRAM_TIMEOUT_MS,
                    'Deepgram transcribeUrl',
                )
                : await withTimeout(
                    deepgramClient.listen.prerecorded.transcribeFile(await fs.readFile(audioPath), options),
                    DEEPGRAM_TIMEOUT_MS,
                    'Deepgram transcribeFile',
                );

            if (response.error) {
                throw new Error(`Deepgram error: ${JSON.stringify(response.error)}`);
            }

            const channel = response.result?.results?.channels?.[0]?.alternatives?.[0];
            deepgramWords = channel?.words ?? [];
            duration = response.result?.metadata?.duration ?? 0;
            lastError = null;
            break;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown Deepgram error');
            if (attempt < DEEPGRAM_MAX_RETRIES) {
                await sleep(500 * attempt);
            }
        }
    }

    if (lastError) {
        throw lastError;
    }

    // Build a flat map of word → { start, end } from Deepgram output
    // Then match against our transcript words for target vocab marking
    const transcriptWordSet = new Set<string>(
        transcript.flatMap((l) => l.words.map((w) => w.word.toLowerCase())),
    );

    const words: AudioWord[] = deepgramWords.map((dw) => ({
        word: dw.word ?? '',
        start: dw.start ?? 0,
        end: dw.end ?? 0,
        isTargetVocab: transcriptWordSet.has((dw.word ?? '').toLowerCase()),
    }));

    return { words, duration };
}

/**
 * Re-map flat AudioWord list back onto transcript lines using time ranges.
 * Lines with startTime/endTime = 0 (pre-sync) get inferred boundaries from
 * the sequential word timestamps.
 */
function mapWordsToLines(
    transcript: TranscriptLine[],
    allWords: AudioWord[],
    lineDurationsSec?: number[],
): TranscriptLine[] {
    if (transcript.length === 0) return transcript;
    if (allWords.length === 0) {
        return transcript.map((line) => ({
            ...line,
            startTime: 0,
            endTime: 0,
            words: [],
        }));
    }

    // Prefer timing-based segmentation when we have reliable per-line TTS durations.
    // This is much more stable than text matching when ASR normalization differs.
    if (
        lineDurationsSec
        && lineDurationsSec.length === transcript.length
        && lineDurationsSec.every((duration) => Number.isFinite(duration) && duration > 0)
    ) {
        let cursor = 0;
        let lineStart = 0;

        return transcript.map((line, index) => {
            const duration = lineDurationsSec[index] ?? 0;
            const lineEnd = lineStart + duration;

            const lineWords: AudioWord[] = [];
            while (cursor < allWords.length) {
                const word = allWords[cursor]!;
                const midpoint = (word.start + word.end) / 2;
                const isLastLine = index === transcript.length - 1;

                // Assign by midpoint to reduce boundary jitter.
                if (midpoint >= lineStart && (midpoint < lineEnd || isLastLine)) {
                    lineWords.push(word);
                    cursor += 1;
                    continue;
                }

                if (midpoint < lineStart) {
                    // Defensive: if a word timestamp drifts backward, consume it here.
                    lineWords.push(word);
                    cursor += 1;
                    continue;
                }

                break;
            }

            const mapped = {
                ...line,
                startTime: lineWords[0]?.start ?? lineStart,
                endTime: lineWords[lineWords.length - 1]?.end ?? lineEnd,
                words: lineWords,
            };

            lineStart = lineEnd;
            return mapped;
        });
    }

    const normalizeToken = (value: string): string =>
        value
            .toLowerCase()
            .replace(/[^\p{L}\p{N}'$]/gu, '');

    const tokenizeText = (text: string): string[] =>
        text
            .split(/\s+/)
            .map((token) => normalizeToken(token))
            .filter(Boolean);

    const scoreSegment = (segment: AudioWord[], expectedTokens: string[]): number => {
        const segmentTokens = segment.map((w) => normalizeToken(w.word)).filter(Boolean);
        if (segmentTokens.length === 0 && expectedTokens.length === 0) return 0;

        // Ordered greedy match: rewards tokens appearing in expected order.
        let matched = 0;
        let expectedIndex = 0;

        for (const token of segmentTokens) {
            while (expectedIndex < expectedTokens.length && expectedTokens[expectedIndex] !== token) {
                expectedIndex += 1;
            }
            if (expectedIndex < expectedTokens.length) {
                matched += 1;
                expectedIndex += 1;
            }
        }

        const lengthPenalty = Math.abs(segmentTokens.length - expectedTokens.length) * 0.35;
        return matched - lengthPenalty;
    };

    const expectedByLine = transcript.map((line) => tokenizeText(line.text));
    const expectedTotal = Math.max(
        expectedByLine.reduce((sum, tokens) => sum + tokens.length, 0),
        1,
    );

    const mapped: TranscriptLine[] = [];
    let cursor = 0;
    let consumedExpected = 0;

    for (let i = 0; i < transcript.length; i += 1) {
        const line = transcript[i]!;
        const expectedTokens = expectedByLine[i] ?? [];
        const isLastLine = i === transcript.length - 1;

        if (isLastLine) {
            const lineWords = allWords.slice(cursor);
            mapped.push({
                ...line,
                startTime: lineWords[0]?.start ?? 0,
                endTime: lineWords[lineWords.length - 1]?.end ?? 0,
                words: lineWords,
            });
            break;
        }

        consumedExpected += expectedTokens.length;

        const remainingLines = transcript.length - (i + 1);
        const minEndExclusive = cursor + 1;
        const maxEndExclusive = allWords.length - remainingLines;

        // Base boundary by expected token ratio, then refine in local window.
        const ratioBoundary = Math.round((allWords.length * consumedExpected) / expectedTotal);
        const targetEndExclusive = Math.min(
            Math.max(ratioBoundary, minEndExclusive),
            maxEndExclusive,
        );

        let bestEndExclusive = targetEndExclusive;
        let bestScore = Number.NEGATIVE_INFINITY;

        const searchStart = Math.max(minEndExclusive, targetEndExclusive - 6);
        const searchEnd = Math.min(maxEndExclusive, targetEndExclusive + 6);

        for (let endExclusive = searchStart; endExclusive <= searchEnd; endExclusive += 1) {
            const segment = allWords.slice(cursor, endExclusive);
            const score = scoreSegment(segment, expectedTokens);
            if (score > bestScore) {
                bestScore = score;
                bestEndExclusive = endExclusive;
            }
        }

        const lineWords = allWords.slice(cursor, bestEndExclusive);
        mapped.push({
            ...line,
            startTime: lineWords[0]?.start ?? 0,
            endTime: lineWords[lineWords.length - 1]?.end ?? 0,
            words: lineWords,
        });

        cursor = bestEndExclusive;
    }

    return mapped;
}

// ─── Worker Processor ─────────────────────────────────────────────────────────

async function processMixSyncJob(job: Job<ListeningMixSyncJobPayload>): Promise<void> {
    const { lessonId, transcript, accent: _accent, noiseLevel, speakerVoiceMap } = job.data;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `unilish-ls-${lessonId}-`));

    // Clients created inside the job processor so they are never instantiated at module load
    // time (both SDKs throw an error when the API key is an empty string).
    const elevenLabsClient = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY ?? '' });
    // deepgramClient is created lazily below only when DEEPGRAM_API_KEY is present
    // — createDeepgramClient('') throws "Region is missing" immediately.

    logger.info(`[ListeningMixSyncWorker] Job ${job.id} started`, { lessonId, lines: transcript.length });

    try {
        // ── Step 1: ElevenLabs TTS — synthesise each line ────────────────────
        await listeningRepo.setGenerationStatus(lessonId, 'GENERATING_AUDIO');
        await job.updateProgress(10);

        // Build speaker → voiceId map, falling back to round-robin defaults
        const speakers = [...new Set(transcript.map((l) => l.speaker))];
        const voiceMap: Record<string, string> = {};
        speakers.forEach((spk, idx) => {
            voiceMap[spk] = speakerVoiceMap[spk]
                ?? DEFAULT_VOICES[idx % DEFAULT_VOICES.length]
                ?? FALLBACK_FREE_VOICE_ID;
        });

        const linePaths: string[] = [];
        const ttsTasks = transcript.map((line, index) => async () => {
            const voiceId = voiceMap[line.speaker] ?? FALLBACK_FREE_VOICE_ID;
            const linePath = path.join(tmpDir, `line-${index}.mp3`);
            await synthesiseLine(elevenLabsClient, line.text, voiceId, linePath);
            return { index, linePath };
        });

        const ttsResults = await runWithConcurrency(ttsTasks, TTS_CONCURRENCY);
        const sortedPaths = ttsResults
            .sort((a, b) => a.index - b.index)
            .map((item) => item.linePath);
        linePaths.push(...sortedPaths);
        await job.updateProgress(40);

        logger.info(`[ListeningMixSyncWorker] TTS complete`, { lessonId, lines: linePaths.length });

        // ── Step 2: FFmpeg — concatenate + mix noise ─────────────────────────
        await job.updateProgress(45);
        const concatPath = path.join(tmpDir, 'dialogue.wav');
        await concatenateAudio(linePaths, concatPath);

        const mixedPath = path.join(tmpDir, 'final.mp3');
        await mixWithNoise(concatPath, noiseLevel, mixedPath);
        const mixedDuration = await getAudioDuration(mixedPath);

        await job.updateProgress(65);
        logger.info(`[ListeningMixSyncWorker] FFmpeg mix complete`, { lessonId });

        // ── Step 3: Upload to R2 ─────────────────────────────────────────────
        const r2Key = listeningAudioKey(lessonId);
        await uploadToR2(mixedPath, r2Key);
        // Store as a server-side proxy URL so the browser never needs R2 credentials
        const audioUrl = `/api/curriculum/lessons/${lessonId}/listening/audio?v=${Date.now()}`;

        await job.updateProgress(75);
        logger.info(`[ListeningMixSyncWorker] Uploaded to R2`, { lessonId, r2Key });

        // ── Step 4: Deepgram word-level sync (optional — skipped if no key) ──
        let finalTranscript = transcript;
        let duration = mixedDuration;

        if (env.DEEPGRAM_API_KEY) {
            const deepgramClient = createDeepgramClient(env.DEEPGRAM_API_KEY);
            await listeningRepo.setGenerationStatus(lessonId, 'SYNCING');
            await job.updateProgress(78);

            const publicAudioUrl = getPublicAudioUrlFromR2Key(r2Key);

            try {
                const { words: allWords, duration: audioDuration } = await getWordTimestamps(
                    deepgramClient,
                    mixedPath,
                    transcript,
                    publicAudioUrl ?? undefined,
                );
                const lineDurations = await runWithConcurrency(
                    linePaths.map((linePath) => async () => getAudioDuration(linePath)),
                    4,
                );
                finalTranscript = mapWordsToLines(transcript, allWords, lineDurations);
                duration = audioDuration || duration;

                await job.updateProgress(92);
                logger.info(`[ListeningMixSyncWorker] Deepgram sync complete`, { lessonId, words: allWords.length, duration });
            } catch (error) {
                // Do not fail the whole pipeline when Deepgram has transient upload timeout.
                logger.warn(`[ListeningMixSyncWorker] Deepgram sync skipped after retries`, {
                    lessonId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                await job.updateProgress(92);
            }
        } else {
            logger.warn(`[ListeningMixSyncWorker] DEEPGRAM_API_KEY not set — skipping word-level sync`, { lessonId });
            await job.updateProgress(92);
        }

        // ── Step 5: Persist results ──────────────────────────────────────────
        await listeningRepo.setAudioAndWords(lessonId, audioUrl, duration, finalTranscript);

        await job.updateProgress(100);
        logger.info(`[ListeningMixSyncWorker] Job ${job.id} DONE`, { lessonId });
    } finally {
        // Always clean up temp files
        await fs.rm(tmpDir, { recursive: true, force: true });
    }
}

// ─── Worker Instance ──────────────────────────────────────────────────────────

export const listeningMixSyncWorker = new Worker<ListeningMixSyncJobPayload>(
    'listening-mix-sync',
    processMixSyncJob,
    {
        connection: { url: env.REDIS_URI || 'redis://localhost:6379' },
        concurrency: 1,  // CPU/memory intensive — run one at a time
    },
);

listeningMixSyncWorker.on('failed', (job, err) => {
    logger.error(`[ListeningMixSyncWorker] Job ${job?.id} failed`, {
        error: err.message,
        lessonId: job?.data.lessonId,
    });
    if (job?.data.lessonId) {
        listeningRepo
            .setGenerationStatus(job.data.lessonId, 'ERROR')
            .catch(() => undefined);
    }
});

listeningMixSyncWorker.on('completed', (job) => {
    logger.info(`[ListeningMixSyncWorker] Job ${job.id} completed`, {
        lessonId: job.data.lessonId,
    });
});
