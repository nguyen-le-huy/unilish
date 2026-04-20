import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { logger } from '../utils/logger.js';
import { aiVoiceService } from '../services/ai-voice.service.js';
import type {
    AiVoiceChatBody,
    AiVoiceGenerateScenariosBody,
    AiVoiceSttBody,
    AiVoiceTtsBody,
} from '../validations/ai-voice.validation.js';

const toSseEvent = (event: string, payload: Record<string, unknown>): string => {
    return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
};

export const aiVoiceController = {
    stt: catchAsync(async (req: Request<{}, {}, AiVoiceSttBody>, res: Response) => {
        const file = req.file;
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new AppError('Audio file is required.', HttpStatus.BAD_REQUEST);
        }

        const result = await aiVoiceService.transcribeAudio(file.buffer);
        res.status(HttpStatus.OK).json(result);
    }),

    chat: catchAsync(async (req: Request<{}, {}, AiVoiceChatBody>, res: Response) => {
        const { sessionId, scenario, transcript, chatHistory, level, topic } = req.body;
        const startedAt = Date.now();

        const completion = await aiVoiceService.createChatCompletion({
            sessionId,
            scenario,
            transcript,
            chatHistory,
            level,
            topic,
        });

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
                isConversationEnded: completion.isConversationEnded,
            }));
        } catch (error: unknown) {
            logger.error('[ai-voice.controller] Error during SSE stream', {
                sessionId,
                error,
            });

            res.write(toSseEvent('error', { message: 'Stream failed' }));
        } finally {
            res.end();
        }
    }),

    tts: catchAsync(async (req: Request<{}, {}, AiVoiceTtsBody>, res: Response) => {
        const { text } = req.body;
        const streamResponse = await aiVoiceService.synthesizeSpeech(text);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Transfer-Encoding', 'chunked');

        const audioBuffer = Buffer.from(await streamResponse.arrayBuffer());
        res.status(HttpStatus.OK).send(audioBuffer);
    }),

    generateScenarios: catchAsync(async (req: Request<{}, {}, AiVoiceGenerateScenariosBody>, res: Response) => {
        const { topic, level } = req.body;

        const scenarios = await aiVoiceService.generateScenarios(topic, level);

        res.status(HttpStatus.OK).json({ scenarios });
    }),
};