import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { speakingPipelineService } from './speaking-pipeline.service.js';
import { AzurePronunciationService, type PronunciationResult } from './azure-pronunciation.service.js';
import { aiVoicePromptBuilder } from './ai-voice-prompt-builder.js';
import type {
    AiVoiceChatBody,
    AiVoiceChatHistoryItem,
    AiVoiceLevel,
    AiVoiceScenario,
    AiVoiceTopic,
} from '../validations/ai-voice.validation.js';

const MAX_TURNS = 8;
const START_SIGNAL = '__START__';
const FALLBACK_MODEL = 'gpt-4o-mini';

const aiVoiceAssessmentScenarioSchema = z.object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1000),
});

const aiVoiceAssessmentTurnSchema = z.object({
    transcript: z.string().trim().min(1).max(1000),
    durationMs: z.number().int().nonnegative().max(120_000),
});

const aiVoiceAssessmentResultSchema = z.object({
    teacherSummary: z.string().trim().min(10).max(500),
    levelAssessment: z.string().trim().min(10).max(300),
    pronunciationFeedback: z.string().trim().min(10).max(300),
    grammarFeedback: z.string().trim().min(10).max(300),
    vocabularyFeedback: z.string().trim().min(10).max(300),
    grammarScore: z.number().min(0).max(100),
    vocabularyScore: z.number().min(0).max(100),
    fluencyScore: z.number().min(0).max(100),
    overallScore: z.number().min(0).max(100),
    strengths: z.array(z.string().trim().min(1)).max(5),
    improvements: z.array(z.string().trim().min(1)).max(5),
    corrections: z.array(z.object({
        original: z.string().trim().min(1),
        corrected: z.string().trim().min(1),
        explanation: z.string().trim().min(1),
    })).max(8),
});

const CEFR_RUBRIC: Record<AiVoiceLevel, string> = {
    'free-level': 'Đánh giá tự nhiên theo chất lượng thể hiện, không áp một mức CEFR cố định.',
    a1: 'A1: dùng được cụm từ và câu rất cơ bản về chủ đề quen thuộc; ưu tiên khả năng truyền đạt ý đơn giản và độ rõ ràng.',
    a2: 'A2: giao tiếp được trong tình huống quen thuộc; dùng được câu nối đơn giản, thì cơ bản và từ vựng đời sống.',
    b1: 'B1: diễn đạt được ý chính bằng các câu có liên kết; dùng tương đối ổn các cấu trúc quen thuộc và từ vựng thực tế.',
    b2: 'B2: giao tiếp khá trôi chảy; dùng nhiều cấu trúc, liên từ và từ vựng chính xác, phù hợp ngữ cảnh.',
    c1: 'C1: diễn đạt linh hoạt, mạch lạc và có sắc thái; dùng cấu trúc phức tạp, collocation và từ vựng chính xác.',
    c2: 'C2: diễn đạt tự nhiên, tinh tế và gần như hoàn toàn chính xác; kiểm soát tốt sắc thái, phong cách và cách dùng từ.',
};

type AiVoiceAssessmentParams = {
    sessionId: string;
    scenario: unknown;
    level: AiVoiceLevel;
    topic: AiVoiceTopic;
    turns: unknown;
    audioFiles: Express.Multer.File[];
};

export type AiVoiceAssessmentResult = {
    pronunciation: {
        overallScore: number;
        words: PronunciationResult['words'];
        assessedTurns: number;
        failedTurns: number;
    };
    language: z.infer<typeof aiVoiceAssessmentResultSchema>;
};

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

interface GenerateSuggestedReplyParams {
    sessionId: string;
    scenario: AiVoiceScenario;
    level: AiVoiceLevel;
    topic: AiVoiceTopic;
    assistantReply: string;
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

const createSuggestionCompletion = async (
    model: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> => {
    const completion = await openaiClient.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 80,
        temperature: 0.7,
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
};

export const aiVoiceService = {
    transcribeAudio: async (audio: Buffer): Promise<{ transcript: string; durationMs: number }> => {
        return speakingPipelineService.transcribeAudio(audio);
    },

    assessConversation: async ({
        sessionId,
        scenario,
        level,
        topic,
        turns,
        audioFiles,
    }: AiVoiceAssessmentParams): Promise<AiVoiceAssessmentResult> => {
        const parsedScenario = aiVoiceAssessmentScenarioSchema.parse(scenario);
        const parsedTurns = z.array(aiVoiceAssessmentTurnSchema).min(1).max(12).parse(turns);
        const assessmentInput = parsedTurns.map((turn, index) => ({
            ...turn,
            audio: audioFiles[index],
        }));

        const pronunciationResults = await Promise.all(assessmentInput.map(async (turn, turnIndex) => {
            if (!turn.audio?.buffer?.length) {
                return null;
            }

            try {
                return await AzurePronunciationService.scoreAudioBuffer(
                    turn.audio.buffer,
                    turn.transcript,
                    turn.audio.mimetype,
                );
            } catch (error: unknown) {
                logger.warn('[ai-voice.service] Azure pronunciation assessment failed', {
                    sessionId,
                    turnIndex,
                    error,
                });
                return null;
            }
        }));

        const successfulPronunciation = pronunciationResults.filter(
            (result): result is PronunciationResult => result !== null,
        );
        const allWords = successfulPronunciation.flatMap((result) => result.words);
        const pronunciationOverallScore = successfulPronunciation.length > 0
            ? Math.round(successfulPronunciation.reduce((sum, result) => sum + result.overallScore, 0) / successfulPronunciation.length)
            : 0;

        const transcript = parsedTurns.map((turn, index) => `Turn ${index + 1}: ${turn.transcript}`).join('\n');
        const pronunciationWords = allWords
            .filter((word) => word.accuracyScore < 70 || word.errorType !== 'None')
            .slice(0, 20)
            .map((word) => `${word.word} (${word.accuracyScore}/100, ${word.errorType})`)
            .join(', ') || 'Không có lỗi phát âm nổi bật được ghi nhận.';
        const gradingPrompt = [
            'Evaluate an English learner speaking conversation.',
            `Level: ${level}. Topic: ${topic}. Scenario: ${parsedScenario.title} - ${parsedScenario.description}`,
            `CEFR rubric: ${CEFR_RUBRIC[level]}`,
            `Azure pronunciation score: ${pronunciationOverallScore}/100. Potential pronunciation issues: ${pronunciationWords}`,
            'Score pronunciation, fluency, grammar accuracy, and vocabulary/lexical range from 0 to 100.',
            'Act as a professional Vietnamese-speaking English teacher. Judge the learner against the selected CEFR level, not against a native speaker or a higher level.',
            'Return strict JSON and concise but specific Vietnamese feedback. Mention what the learner can do, what to improve, and give practical next steps.',
            'Required JSON schema:',
            '{"teacherSummary": string, "levelAssessment": string, "pronunciationFeedback": string, "grammarFeedback": string, "vocabularyFeedback": string, "grammarScore": number, "vocabularyScore": number, "fluencyScore": number, "overallScore": number, "strengths": string[], "improvements": string[], "corrections": [{"original": string, "corrected": string, "explanation": string}]}',
            '',
            transcript,
        ].join('\n');

        let languageRaw: string | null = null;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_GRADING_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You are a careful English speaking evaluator. Return valid JSON only.' },
                    { role: 'user', content: gradingPrompt },
                ],
                ...(env.OPENAI_GRADING_MODEL.startsWith('gpt-5') ? { reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT } : {}),
            });
            languageRaw = completion.choices[0]?.message?.content ?? null;
        } catch (error: unknown) {
            logger.error('[ai-voice.service] OpenAI language assessment failed', { sessionId, error });
        }

        let parsedLanguage: ReturnType<typeof aiVoiceAssessmentResultSchema.safeParse> | null = null;
        if (languageRaw) {
            try {
                parsedLanguage = aiVoiceAssessmentResultSchema.safeParse(JSON.parse(languageRaw));
            } catch {
                logger.warn('[ai-voice.service] OpenAI language assessment returned invalid JSON', { sessionId });
            }
        }
        const language = parsedLanguage?.success
            ? parsedLanguage.data
            : {
                teacherSummary: 'Chưa thể hoàn tất phần nhận xét chi tiết cho phiên luyện nói này.',
                levelAssessment: `Kết quả được đối chiếu theo tiêu chí ${level.toUpperCase()}.`,
                pronunciationFeedback: 'Hệ thống chưa lấy được nhận xét phát âm chi tiết.',
                grammarFeedback: 'Hệ thống chưa lấy được nhận xét ngữ pháp chi tiết.',
                vocabularyFeedback: 'Hệ thống chưa lấy được nhận xét từ vựng chi tiết.',
                grammarScore: 0,
                vocabularyScore: 0,
                fluencyScore: 0,
                overallScore: pronunciationOverallScore,
                strengths: [],
                improvements: ['Chưa thể hoàn tất chấm điểm ngữ pháp và từ vựng.'],
                corrections: [],
            };

        return {
            pronunciation: {
                overallScore: pronunciationOverallScore,
                words: allWords,
                assessedTurns: successfulPronunciation.length,
                failedTurns: parsedTurns.length - successfulPronunciation.length,
            },
            language,
        };
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

    generateSuggestedReply: async ({
        sessionId,
        scenario,
        level,
        topic,
        assistantReply,
    }: GenerateSuggestedReplyParams): Promise<string> => {
        const normalizedAssistantReply = assistantReply.trim();
        if (!normalizedAssistantReply) {
            return '';
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: [
                    'You generate one suggested English reply the learner can say next.',
                    'Return plain text only, no quotes, no bullets, no labels.',
                    'Keep it natural, first-person, and concise (1-2 short sentences).',
                    'Match the CEFR level and scenario context.',
                ].join(' '),
            },
            {
                role: 'user',
                content: [
                    `Scenario title: ${scenario.title}`,
                    `Scenario description: ${scenario.description}`,
                    `Topic: ${topic}`,
                    `Learner level: ${level}`,
                    `Assistant latest message: ${normalizedAssistantReply}`,
                    'Write a suggested learner reply now.',
                ].join('\n'),
            },
        ];

        try {
            return await createSuggestionCompletion(env.OPENAI_MODEL, messages);
        } catch (error: unknown) {
            logger.error('[ai-voice.service] Primary suggestion model failed', {
                sessionId,
                model: env.OPENAI_MODEL,
                error,
            });

            try {
                const fallbackSuggestion = await createSuggestionCompletion(FALLBACK_MODEL, messages);
                return fallbackSuggestion;
            } catch (fallbackError: unknown) {
                logger.error('[ai-voice.service] Fallback suggestion model failed', {
                    sessionId,
                    model: FALLBACK_MODEL,
                    error: fallbackError,
                });
                throw fallbackError;
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

};

export type AiVoiceChatCompletionParams = Pick<
    AiVoiceChatBody,
    'sessionId' | 'scenario' | 'transcript' | 'chatHistory' | 'level' | 'topic'
>;
