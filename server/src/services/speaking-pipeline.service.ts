import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { PromptBuilderService } from './speaking-prompt-builder.js';
import { SpeakingLessonMongoRepository } from '../repositories/mongo/speaking-lesson.mongo.repository.js';

type ChatHistoryItem = {
    role: 'user' | 'assistant';
    content: string;
};

type ChatCompletionResult = {
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    model: string;
    requestedModel: string;
    usedFallback: boolean;
};

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const speakingLessonRepo = new SpeakingLessonMongoRepository();
const promptBuilder = new PromptBuilderService();

const resolveVoice = (voiceId?: string): string => {
    const normalized = voiceId?.trim().toLowerCase();
    if (normalized) {
        return normalized;
    }
    return env.OPENAI_REALTIME_VOICE;
};

export const speakingPipelineService = {
    transcribeAudio: async (audio: Buffer) => {
        const uploadFile = await toFile(new Uint8Array(audio), 'speech.webm', {
            type: 'audio/webm',
        });

        const transcription = await openaiClient.audio.transcriptions.create({
            file: uploadFile,
            model: env.OPENAI_REALTIME_TRANSCRIPT_MODEL,
        });

        const transcript = transcription.text?.trim() ?? '';
        if (!transcript) {
            throw new AppError('No transcript returned from STT model.', HttpStatus.BAD_GATEWAY);
        }

        return {
            transcript,
            durationMs: 0,
        };
    },

    createChatCompletion: async (
        lessonId: string,
        transcript: string,
        chatHistory: ChatHistoryItem[],
        pronunciationContext?: string,
    ): Promise<ChatCompletionResult> => {
        const lessonContext = await speakingLessonRepo.findLessonContext(lessonId);
        if (!lessonContext) {
            throw new AppError('Speaking lesson not found', HttpStatus.NOT_FOUND);
        }

        const systemPrompt = promptBuilder.buildSystemPrompt({
            missionTitle: lessonContext.missionTitle,
            missionDescription: lessonContext.missionDescription,
            systemInstruction: lessonContext.aiConfig.systemInstruction,
            roleName: lessonContext.aiConfig.roleName,
            targetLanguage: lessonContext.targetLanguage,
            nativeLanguage: 'vi',
        });

        const pronunciationHint = pronunciationContext?.trim()
            ? `\n\nPronunciation context (for gentle in-character support only):\n${pronunciationContext.trim()}`
            : '';

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `${systemPrompt}${pronunciationHint}`,
            },
            ...chatHistory.map((item) => ({
                role: item.role,
                content: item.content,
            })),
            {
                role: 'user',
                content: transcript,
            },
        ];

        const requestedModel = env.OPENAI_MODEL;

        try {
            const stream = await openaiClient.chat.completions.create({
                model: requestedModel,
                messages,
                stream: true,
                stream_options: { include_usage: true },
                // Disable extended reasoning for gpt-5 series — dramatically reduces latency
                // reasoning_effort: 'low' tells the model to skip deep chain-of-thought
                ...(requestedModel.startsWith('gpt-5') || requestedModel.startsWith('o') ? {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    reasoning_effort: 'low' as any,
                } : {}),
                max_completion_tokens: 256,
            });

            return {
                stream,
                model: requestedModel,
                requestedModel,
                usedFallback: false,
            };
        } catch (err: unknown) {
            console.error('[createChatCompletion] Primary model failed:', err);
            try {
                const fallbackModel = 'gpt-4o-mini';
                const stream = await openaiClient.chat.completions.create({
                    model: fallbackModel,
                    messages,
                    stream: true,
                    stream_options: { include_usage: true },
                    max_tokens: 256,
                });

                return {
                    stream,
                    model: fallbackModel,
                    requestedModel,
                    usedFallback: true,
                };
            } catch (fallbackErr: unknown) {
                console.error('[createChatCompletion] Fallback model also failed:', fallbackErr);
                throw fallbackErr;
            }
        }
    },

    synthesizeSpeech: async (text: string, voiceId?: string) => {
        return openaiClient.audio.speech.create({
            model: env.OPENAI_TTS_MODEL,
            voice: resolveVoice(voiceId),
            input: text,
            response_format: 'mp3',
        });
    },
};
