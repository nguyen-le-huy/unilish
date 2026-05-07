import fs from 'node:fs/promises';
import { createClient as createDeepgramClient } from '@deepgram/sdk';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import type { IShadowingCue } from '../models/mongo/shadowing-video.model.js';
import { logger } from '../utils/logger.js';
import { splitUtteranceIntoSentences } from './deepgram-sentence-splitter.js';

const deepgramClient = createDeepgramClient(env.DEEPGRAM_API_KEY);

export class DeepgramService {
    static async transcribe(filePath: string): Promise<IShadowingCue[]> {
        try {
            const audioBuffer = await fs.readFile(filePath);
            const response = await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
                model: 'nova-2',
                diarize: true,
                utterances: true,
                punctuate: true,
                words: true,
                smart_format: true,
                paragraphs: true,
            });

            if (response.error) {
                throw new AppError('Deepgram transcription failed', HttpStatus.BAD_GATEWAY);
            }

            const utterances = response.result?.results?.utterances ?? [];

            logger.info('DeepgramService: transcription complete', {
                utteranceCount: utterances.length,
            });

            const segments = utterances.flatMap((utterance) => splitUtteranceIntoSentences({
                ...(utterance.transcript !== undefined ? { transcript: utterance.transcript } : {}),
                ...(utterance.start !== undefined ? { start: utterance.start } : {}),
                ...(utterance.end !== undefined ? { end: utterance.end } : {}),
                ...(utterance.speaker !== undefined ? { speaker: utterance.speaker } : {}),
                ...(utterance.words
                    ? {
                        words: utterance.words.map((word) => ({
                            ...(word.word !== undefined ? { word: word.word } : {}),
                            ...(word.start !== undefined ? { start: word.start } : {}),
                            ...(word.end !== undefined ? { end: word.end } : {}),
                            ...(word.speaker !== undefined ? { speaker: word.speaker } : {}),
                        })),
                    }
                    : {}),
            }));

            const cues: IShadowingCue[] = segments
                .filter((s) => s.text.length > 0)
                .map((s, index) => ({
                    id: `cue-${index}`,
                    text: s.text,
                    translationVi: null,
                    vocabulary: [],
                    commonPhrases: [],
                    startMs: s.startMs,
                    endMs: s.endMs,
                }));

            logger.info('DeepgramService: cue generation complete', {
                cueCount: cues.length,
            });

            return cues;
        } catch (error) {
            logger.error('Deepgram transcription error', { filePath, error });
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Deepgram transcription failed', HttpStatus.BAD_GATEWAY);
        } finally {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                logger.warn('Could not remove temporary shadowing audio file', { filePath, error });
            }
        }
    }
}
