import fs from 'node:fs/promises';
import { createClient as createDeepgramClient } from '@deepgram/sdk';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import type { IShadowingCue } from '../models/mongo/shadowing-video.model.js';
import { logger } from '../utils/logger.js';

const deepgramClient = createDeepgramClient(env.DEEPGRAM_API_KEY);

export class DeepgramService {
    static async transcribe(filePath: string): Promise<IShadowingCue[]> {
        try {
            const audioBuffer = await fs.readFile(filePath);
            const response = await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
                model: 'nova-2',
                utterances: true,
                punctuate: true,
                words: true,
            });

            if (response.error) {
                throw new AppError('Deepgram transcription failed', HttpStatus.BAD_GATEWAY);
            }

            const utterances = response.result?.results?.utterances ?? [];
            const cues = utterances
                .map((utterance, index) => {
                    const startMs = Math.max(0, Math.round((utterance.start ?? 0) * 1000));
                    const endMs = Math.max(startMs, Math.round((utterance.end ?? utterance.start ?? 0) * 1000));

                    return {
                        id: `cue-${index}`,
                        text: utterance.transcript?.trim() ?? '',
                        startMs,
                        endMs,
                    };
                })
                .filter((cue) => cue.text.length > 0);

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
