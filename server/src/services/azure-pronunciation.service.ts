import sdk from 'microsoft-cognitiveservices-speech-sdk';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { logger } from '../utils/logger.js';

export type PronunciationErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';

export interface PronunciationWordResult {
    word: string;
    accuracyScore: number;
    errorType: PronunciationErrorType;
}

export interface PronunciationResult {
    overallScore: number;
    words: PronunciationWordResult[];
}

const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toNumber = (value: unknown, fallback: number = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const toErrorType = (value: unknown): PronunciationErrorType => {
    if (value === 'None' || value === 'Omission' || value === 'Insertion' || value === 'Mispronunciation') {
        return value;
    }

    return 'None';
};

const normalizeWord = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }

    return '';
};

const parseWordResults = (jsonPayload: string): PronunciationWordResult[] => {
    const parsed: unknown = JSON.parse(jsonPayload);
    if (!isObject(parsed)) {
        return [];
    }

    const nBest = parsed['NBest'];
    if (!Array.isArray(nBest) || nBest.length === 0 || !isObject(nBest[0])) {
        return [];
    }

    const words = nBest[0]['Words'];
    if (!Array.isArray(words)) {
        return [];
    }

    return words
        .map((item): PronunciationWordResult | null => {
            if (!isObject(item)) {
                return null;
            }

            const word = normalizeWord(item['Word']);
            const pronunciationAssessment = item['PronunciationAssessment'];

            if (!word || !isObject(pronunciationAssessment)) {
                return null;
            }

            return {
                word,
                accuracyScore: toNumber(pronunciationAssessment['AccuracyScore']),
                errorType: toErrorType(pronunciationAssessment['ErrorType']),
            };
        })
        .filter((item): item is PronunciationWordResult => item !== null);
};

const getFallbackWordResults = (referenceText: string, overallScore: number): PronunciationWordResult[] => {
    return referenceText
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)
        .map((word) => ({
            word,
            accuracyScore: overallScore,
            errorType: 'None' as const,
        }));
};

const resolveAudioFormat = (audioMimeType?: string): sdk.AudioStreamFormat | undefined => {
    if (!audioMimeType) {
        return undefined;
    }

    const normalizedMimeType = audioMimeType.toLowerCase();

    // Only support WAV/PCM now (ffmpeg will convert WebM/Opus to WAV)
    if (normalizedMimeType.includes('wav')) {
        return sdk.AudioStreamFormat.getWaveFormatPCM(16_000, 16, 1);
    }

    return undefined;  // Falls back to default PCM
};

const convertWebMToWav = async (webmBuffer: Buffer): Promise<Buffer> => {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const inputPath = path.join(tmpDir, `shadowing-input-${timestamp}.webm`);
    const outputPath = path.join(tmpDir, `shadowing-output-${timestamp}.wav`);

    try {
        logger.info('Converting WebM to WAV', { inputSize: webmBuffer.length });
        await fs.writeFile(inputPath, webmBuffer);

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('ffmpeg conversion timeout after 30s'));
            }, 30_000);

            ffmpeg(inputPath)
                .toFormat('wav')
                .audioFrequency(16_000)
                .audioChannels(1)
                .audioBitrate('128k')
                .on('end', () => {
                    clearTimeout(timeout);
                    resolve();
                })
                .on('error', (err: Error) => {
                    clearTimeout(timeout);
                    reject(err);
                })
                .save(outputPath);
        });

        const wavBuffer = await fs.readFile(outputPath);
        logger.info('Audio converted to WAV successfully', { outputSize: wavBuffer.length });
        return wavBuffer;
    } catch (error) {
        logger.error('WebM to WAV conversion failed', { error: error instanceof Error ? error.message : String(error) });
        throw error;
    } finally {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
    }
};

const recognizeOnce = (recognizer: sdk.SpeechRecognizer): Promise<sdk.SpeechRecognitionResult> => {
    return new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
        recognizer.recognizeOnceAsync(resolve, reject);
    });
};

export class AzurePronunciationService {
    static async scoreAudioBuffer(
        audioBuffer: Buffer,
        referenceText: string,
        audioMimeType?: string,
    ): Promise<PronunciationResult> {
        let recognizer: sdk.SpeechRecognizer | null = null;

        try {
            // Convert WebM/Opus to WAV/PCM for Azure compatibility
            let audioToProcess = audioBuffer;
            const normalizedMimeType = (audioMimeType ?? '').toLowerCase();

            if (normalizedMimeType.includes('webm') || normalizedMimeType.includes('ogg')) {
                logger.info('Converting audio to WAV for Azure', { mimeType: audioMimeType });
                audioToProcess = await convertWebMToWav(audioBuffer);
            }

            const speechConfig = sdk.SpeechConfig.fromSubscription(env.AZURE_SPEECH_KEY, env.AZURE_SPEECH_REGION);
            speechConfig.speechRecognitionLanguage = env.AZURE_SPEECH_LANGUAGE;

            const bytes = new Uint8Array(audioToProcess);
            const audioFormat = resolveAudioFormat('audio/wav');  // Now always WAV
            const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
            pushStream.write(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
            pushStream.close();

            const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
            recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

            const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
                referenceText,
                sdk.PronunciationAssessmentGradingSystem.HundredMark,
                sdk.PronunciationAssessmentGranularity.Word,
                true,
            );
            pronunciationConfig.applyTo(recognizer);

            const result = await recognizeOnce(recognizer);

            if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
                logger.warn('Azure Speech did not recognize', { reason: result.reason });
                throw new AppError('Azure Speech did not return recognized speech.', HttpStatus.BAD_GATEWAY);
            }

            const assessment = sdk.PronunciationAssessmentResult.fromResult(result);
            const overallScore = Math.round(toNumber(assessment?.pronunciationScore));

            const jsonPayload = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
            const wordResults = jsonPayload
                ? parseWordResults(jsonPayload)
                : getFallbackWordResults(referenceText, overallScore);

            return {
                overallScore,
                words: wordResults.length > 0
                    ? wordResults
                    : getFallbackWordResults(referenceText, overallScore),
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error('Azure Pronunciation Scoring failed', { error });
            throw new AppError('Unable to score pronunciation.', HttpStatus.BAD_GATEWAY);
        } finally {
            recognizer?.close();
        }
    }
}
