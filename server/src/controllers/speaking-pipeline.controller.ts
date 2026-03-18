import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { speakingPipelineService } from '../services/speaking-pipeline.service.js';
import type {
    SpeakingChatBody,
    SpeakingSttBody,
    SpeakingTtsBody,
} from '../validations/speaking-pipeline.validation.js';

const toSseEvent = (event: string, payload: Record<string, unknown>): string => {
    return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
};

export const speakingPipelineController = {
    stt: catchAsync(async (req: Request<{}, {}, SpeakingSttBody>, res: Response) => {
        const file = req.file;
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new AppError('Audio file is required.', HttpStatus.BAD_REQUEST);
        }

        const result = await speakingPipelineService.transcribeAudio(file.buffer);
        res.status(HttpStatus.OK).json(result);
    }),

    chat: catchAsync(async (req: Request<{}, {}, SpeakingChatBody>, res: Response) => {
        const { lessonId, transcript, chatHistory, pronunciationContext } = req.body;
        const startedAt = Date.now();

        const completion = await speakingPipelineService.createChatCompletion(
            lessonId,
            transcript,
            chatHistory,
            pronunciationContext,
        );

        let fullText = '';
        let tokenUsage = 0;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        try {
            for await (const chunk of completion.stream) {
                const text = chunk.choices[0]?.delta?.content ?? '';
                if (text) {
                    fullText += text;
                    res.write(toSseEvent('chunk', { text }));
                }

                const usage = chunk.usage?.total_tokens;
                if (typeof usage === 'number') {
                    tokenUsage = usage;
                }
            }

            res.write(toSseEvent('done', {
                text: fullText,
                latencyMs: Date.now() - startedAt,
                tokenUsage,
                model: completion.model,
                requestedModel: completion.requestedModel,
                usedFallback: completion.usedFallback,
            }));
        } catch (error) {
            console.error('[speaking-pipeline.controller] Error during SSE stream:', error);
            // Send a final error event to inform the client
            res.write(toSseEvent('error', { message: 'Stream failed' }));
        } finally {
            res.end();
        }
    }),

    tts: catchAsync(async (req: Request<{}, {}, SpeakingTtsBody>, res: Response) => {
        const { text, voiceId } = req.body;

        const streamResponse = await speakingPipelineService.synthesizeSpeech(text, voiceId);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Transfer-Encoding', 'chunked');

        const audioBuffer = Buffer.from(await streamResponse.arrayBuffer());
        res.status(HttpStatus.OK).send(audioBuffer);
    }),
};
