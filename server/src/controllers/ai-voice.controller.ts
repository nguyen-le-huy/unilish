import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { logger } from '../utils/logger.js';
import { aiVoiceService } from '../services/ai-voice.service.js';
import { aiVoiceContentService } from '../services/ai-voice-content.service.js';
import { sendResponse } from '../utils/send-response.js';
import type {
    AiVoiceChatBody,
    AiVoiceAssessmentBody,
    AiVoiceSttBody,
    AiVoiceTtsBody,
} from '../validations/ai-voice.validation.js';
import type { AiVoiceTopicBody } from '../validations/ai-voice-content.validation.js';

const toSseEvent = (event: string, payload: Record<string, unknown>): string => {
    return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
};

export const aiVoiceController = {
    getCatalog: catchAsync(async (_req: Request, res: Response) => {
        const topics = await aiVoiceContentService.getPublicCatalog();
        sendResponse(res, HttpStatus.OK, 'Get AI Voice catalog successfully', topics);
    }),

    getAdminTopics: catchAsync(async (_req: Request, res: Response) => {
        const topics = await aiVoiceContentService.getAdminTopics();
        sendResponse(res, HttpStatus.OK, 'Get AI Voice topics successfully', topics);
    }),

    createTopic: catchAsync(async (req: Request<{}, {}, AiVoiceTopicBody>, res: Response) => {
        const topic = await aiVoiceContentService.createTopic(req.body);
        sendResponse(res, HttpStatus.CREATED, 'Create AI Voice topic successfully', topic);
    }),

    updateTopic: catchAsync(async (req: Request<{ id: string }, {}, AiVoiceTopicBody>, res: Response) => {
        const topic = await aiVoiceContentService.updateTopic(req.params.id, req.body);
        sendResponse(res, HttpStatus.OK, 'Update AI Voice topic successfully', topic);
    }),

    deleteTopic: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
        await aiVoiceContentService.deleteTopic(req.params.id);
        sendResponse(res, HttpStatus.OK, 'Delete AI Voice topic successfully', null);
    }),

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
        const managedScenario = await aiVoiceContentService.getActiveScenario(topic, scenario.id);

        const completion = await aiVoiceService.createChatCompletion({
            sessionId,
            scenario: managedScenario,
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

            let suggestedReply = '';
            if (fullText.trim()) {
                try {
                    suggestedReply = await aiVoiceService.generateSuggestedReply({
                        sessionId,
                        scenario: managedScenario,
                        level,
                        topic,
                        assistantReply: fullText,
                    });
                } catch (error: unknown) {
                    logger.warn('[ai-voice.controller] Failed to generate suggested reply', {
                        sessionId,
                        error,
                    });
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
                suggestedReply,
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

    assessment: catchAsync(async (req: Request<{}, {}, AiVoiceAssessmentBody>, res: Response) => {
        const files = Array.isArray(req.files) ? req.files : [];
        const { sessionId, scenario, level, topic, turns: turnsJson } = req.body;

        let scenarioData: unknown;
        let turns: unknown;
        try {
            scenarioData = JSON.parse(scenario);
            turns = JSON.parse(turnsJson);
        } catch {
            throw new AppError('Assessment payload is invalid.', HttpStatus.BAD_REQUEST);
        }

        if (!scenarioData || typeof scenarioData !== 'object' || !('id' in scenarioData) || typeof scenarioData.id !== 'string') {
            throw new AppError('Assessment scenario is invalid.', HttpStatus.BAD_REQUEST);
        }
        const managedScenario = await aiVoiceContentService.getActiveScenario(topic, scenarioData.id);

        const result = await aiVoiceService.assessConversation({
            sessionId,
            scenario: managedScenario,
            level,
            topic,
            turns,
            audioFiles: files,
        });

        res.status(HttpStatus.OK).json(result);
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

};
