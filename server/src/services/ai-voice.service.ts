import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { speakingPipelineService } from './speaking-pipeline.service.js';
import { aiVoicePromptBuilder } from './ai-voice-prompt-builder.js';
import type {
    AiVoiceChatBody,
    AiVoiceChatHistoryItem,
    AiVoiceGenerateScenariosBody,
    AiVoiceLevel,
    AiVoiceScenario,
    AiVoiceTopic,
} from '../validations/ai-voice.validation.js';

const MAX_TURNS = 8;
const START_SIGNAL = '__START__';
const FALLBACK_MODEL = 'gpt-4o-mini';

const aiVoiceGeneratedScenarioSchema = z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1000),
});

const aiVoiceGeneratedScenariosSchema = z.object({
    scenarios: z.array(aiVoiceGeneratedScenarioSchema).length(6),
});

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

type ChatCompletionResult = {
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    model: string;
    requestedModel: string;
    usedFallback: boolean;
    isConversationEnded: boolean;
};

interface CreateAiVoiceChatCompletionParams {
    sessionId: string;
    scenario: AiVoiceScenario;
    transcript: string;
    chatHistory: AiVoiceChatHistoryItem[];
    level: AiVoiceLevel;
    topic: AiVoiceTopic;
}

const toChatMessage = (item: AiVoiceChatHistoryItem): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
    role: item.role,
    content: item.content,
});

const toUserPrompt = (transcript: string): string => {
    if (transcript.trim() === START_SIGNAL) {
        return 'Please start the conversation now with a warm greeting and one short opening question.';
    }

    return transcript;
};

const createStreamingCompletion = async (
    model: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> => {
    return openaiClient.chat.completions.create({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: 256,
    });
};

const normalizeDescription = (description: string): string => {
    const trimmed = description.trim();
    if (!trimmed) {
        return 'Bạn là người đối thoại trong tình huống luyện nói tiếng Anh.';
    }

    if (trimmed.startsWith('Bạn là')) {
        return trimmed;
    }

    return `Bạn là ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};

const buildFallbackScenario = (topic: AiVoiceTopic, level: AiVoiceLevel, index: number): AiVoiceScenario => {
    const sequence = index + 1;

    return {
        id: randomUUID(),
        title: `Scenario ${sequence} - ${topic.toUpperCase()}`,
        description: `Bạn là người đối thoại trong chủ đề ${topic} ở mức ${level}, cùng luyện hội thoại tự nhiên với người học.`,
    };
};

const normalizeGeneratedScenarios = (
    rawScenarios: unknown,
    topic: AiVoiceTopic,
    level: AiVoiceLevel,
): { scenarios: AiVoiceScenario[] } => {
    const parsedArray = z.array(z.record(z.string(), z.unknown())).safeParse(rawScenarios);
    const normalized: AiVoiceScenario[] = [];

    if (parsedArray.success) {
        parsedArray.data.forEach((item) => {
            const titleValue = item.title;
            const descriptionValue = item.description;

            const title = typeof titleValue === 'string' ? titleValue.trim() : '';
            const descriptionRaw = typeof descriptionValue === 'string' ? descriptionValue : '';

            if (!title || !descriptionRaw.trim()) {
                return;
            }

            normalized.push({
                id: randomUUID(),
                title,
                description: normalizeDescription(descriptionRaw),
            });
        });
    }

    const sliced = normalized.slice(0, 6);
    while (sliced.length < 6) {
        sliced.push(buildFallbackScenario(topic, level, sliced.length));
    }

    return { scenarios: sliced };
};

export const aiVoiceService = {
    transcribeAudio: async (audio: Buffer): Promise<{ transcript: string; durationMs: number }> => {
        return speakingPipelineService.transcribeAudio(audio);
    },

    createChatCompletion: async ({
        sessionId,
        scenario,
        transcript,
        chatHistory,
        level,
        topic,
    }: CreateAiVoiceChatCompletionParams): Promise<ChatCompletionResult> => {
        const isConversationEnded = chatHistory.length >= MAX_TURNS;

        const systemPrompt = aiVoicePromptBuilder.buildSystemPrompt({
            scenario,
            level,
            topic,
            maxTurns: MAX_TURNS,
            shouldEndConversation: isConversationEnded,
        });

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...chatHistory.map(toChatMessage),
            {
                role: 'user',
                content: toUserPrompt(transcript),
            },
        ];

        const requestedModel = env.OPENAI_MODEL;

        try {
            const stream = await createStreamingCompletion(requestedModel, messages);

            return {
                stream,
                model: requestedModel,
                requestedModel,
                usedFallback: false,
                isConversationEnded,
            };
        } catch (error: unknown) {
            logger.error('[ai-voice.service] Primary chat model failed', {
                sessionId,
                requestedModel,
                error,
            });

            try {
                const stream = await createStreamingCompletion(FALLBACK_MODEL, messages);

                return {
                    stream,
                    model: FALLBACK_MODEL,
                    requestedModel,
                    usedFallback: true,
                    isConversationEnded,
                };
            } catch (fallbackError: unknown) {
                logger.error('[ai-voice.service] Fallback chat model failed', {
                    sessionId,
                    fallbackModel: FALLBACK_MODEL,
                    error: fallbackError,
                });

                throw new AppError('AI voice chat is temporarily unavailable.', HttpStatus.BAD_GATEWAY);
            }
        }
    },

    synthesizeSpeech: async (text: string) => {
        const normalizedText = text.trim();
        if (!normalizedText) {
            throw new AppError('text is required', HttpStatus.BAD_REQUEST);
        }

        return speakingPipelineService.synthesizeSpeech(normalizedText);
    },

    generateScenarios: async (topic: AiVoiceTopic, level: AiVoiceLevel): Promise<AiVoiceScenario[]> => {
        const prompt = `Bạn đang tạo tình huống luyện nói tiếng Anh cho người học.\n\nYêu cầu:\n- Trả về đúng 6 tình huống.\n- Độ khó phù hợp level: ${level}.\n- Chủ đề cố định: ${topic}.\n- Mỗi description phải bắt đầu bằng \"Bạn là ...\".\n- Mỗi tình huống cần title ngắn gọn, tự nhiên, dễ hiểu.\n\nTrả về JSON hợp lệ duy nhất theo format:\n{\n  \"scenarios\": [\n    { \"title\": \"...\", \"description\": \"Bạn là ...\" }\n  ]\n}`;

        let raw = '{}';

        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You generate speaking practice scenarios and return strict JSON only.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            raw = completion.choices[0]?.message?.content ?? '{}';
        } catch (error: unknown) {
            logger.error('[ai-voice.service] generateScenarios primary model failed', {
                topic,
                level,
                model: env.OPENAI_MODEL,
                error,
            });

            try {
                const fallbackCompletion = await openaiClient.chat.completions.create({
                    model: FALLBACK_MODEL,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You generate speaking practice scenarios and return strict JSON only.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                });

                raw = fallbackCompletion.choices[0]?.message?.content ?? '{}';
            } catch (fallbackError: unknown) {
                logger.error('[ai-voice.service] generateScenarios fallback model failed', {
                    topic,
                    level,
                    model: FALLBACK_MODEL,
                    error: fallbackError,
                });

                throw new AppError('Không thể tạo tình huống AI Voice lúc này. Vui lòng thử lại sau.', HttpStatus.BAD_GATEWAY);
            }
        }

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(raw);
        } catch {
            logger.error('[ai-voice.service] generateScenarios invalid JSON response', { raw });
            throw new AppError('AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const parsedObject = z.object({ scenarios: z.unknown() }).safeParse(parsedJson);
        const normalized = normalizeGeneratedScenarios(parsedObject.success ? parsedObject.data.scenarios : [], topic, level);

        const validated = aiVoiceGeneratedScenariosSchema.safeParse(normalized);
        if (!validated.success) {
            logger.error('[ai-voice.service] generateScenarios output validation failed', {
                topic,
                level,
                issues: validated.error.issues,
            });

            throw new AppError('Không thể chuẩn hóa danh sách tình huống. Vui lòng thử lại.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return validated.data.scenarios;
    },
};

export type AiVoiceChatCompletionParams = Pick<
    AiVoiceChatBody,
    'sessionId' | 'scenario' | 'transcript' | 'chatHistory' | 'level' | 'topic'
>;

export type AiVoiceGenerateScenariosParams = Pick<AiVoiceGenerateScenariosBody, 'topic' | 'level'>;