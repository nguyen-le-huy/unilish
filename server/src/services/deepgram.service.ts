import fs from 'node:fs/promises';
import { createClient as createDeepgramClient } from '@deepgram/sdk';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import type { IShadowingCue } from '../models/mongo/shadowing-video.model.js';
import { logger } from '../utils/logger.js';
import { splitTranscriptWithGpt } from './gpt-sentence-splitter.service.js';

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

            // Send speaker-aligned utterances to GPT so each cue is
            // exactly one complete sentence from a single speaker.
            const segments = await splitTranscriptWithGpt(
                utterances.map((u) => ({
                    ...(u.transcript !== undefined ? { transcript: u.transcript } : {}),
                    ...(u.start !== undefined ? { start: u.start } : {}),
                    ...(u.end !== undefined ? { end: u.end } : {}),
                    ...(u.speaker !== undefined ? { speaker: u.speaker } : {}),
                    ...(u.words
                        ? {
                            words: u.words.map((w) => ({
                                ...(w.word !== undefined ? { word: w.word } : {}),
                                ...(w.start !== undefined ? { start: w.start } : {}),
                                ...(w.end !== undefined ? { end: w.end } : {}),
                                ...(w.speaker !== undefined ? { speaker: w.speaker } : {}),
                            })),
                        }
                        : {}),
                })),
            );

            const cues: IShadowingCue[] = segments
                .filter((s) => s.text.length > 0)
                .map((s, index) => ({
                    id: `cue-${index}`,
                    text: s.text,
                    translationVi: s.translationVi ?? null,
                    vocabulary: s.vocabulary ?? [],
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
