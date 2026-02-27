import OpenAI from 'openai';
import { Lesson } from '../models/mongo/lesson.model.js';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { HttpStatus } from '../constants/http-status.js';
import { SpeakingLessonMongoRepository } from '../repositories/mongo/speaking-lesson.mongo.repository.js';
import { PromptBuilderService } from './speaking-prompt-builder.js';
import type { SaveSpeakingContentBody } from '../validations/speaking.validation.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const speakingLessonRepo = new SpeakingLessonMongoRepository();
const promptBuilder = new PromptBuilderService();

const SUPPORTED_REALTIME_VOICES = new Set([
    'alloy',
    'ash',
    'ballad',
    'coral',
    'echo',
    'sage',
    'shimmer',
    'verse',
    'marin',
    'cedar',
]);

const resolveRealtimeVoice = (lessonVoiceId: string | undefined, envVoiceId: string): string => {
    const normalizedLessonVoice = lessonVoiceId?.trim().toLowerCase();
    if (normalizedLessonVoice && SUPPORTED_REALTIME_VOICES.has(normalizedLessonVoice)) {
        return normalizedLessonVoice;
    }

    const normalizedEnvVoice = envVoiceId.trim().toLowerCase();
    if (normalizedEnvVoice && SUPPORTED_REALTIME_VOICES.has(normalizedEnvVoice)) {
        return normalizedEnvVoice;
    }

    return 'marin';
};

const resolveTurnDetection = ():
    | { type: 'server_vad' | 'semantic_vad'; threshold: number; prefix_padding_ms: number; silence_duration_ms: number }
    | undefined => {
    const mode = env.OPENAI_REALTIME_TURN_DETECTION_MODE;

    if (mode === 'disabled') {
        return undefined;
    }

    const resolvedType = mode === 'semantic' ? 'semantic_vad' : 'server_vad';
    return {
        type: resolvedType,
        threshold: env.OPENAI_REALTIME_TURN_THRESHOLD,
        prefix_padding_ms: env.OPENAI_REALTIME_PREFIX_PADDING_MS,
        silence_duration_ms: env.OPENAI_REALTIME_SILENCE_DURATION_MS,
    };
};

interface RealtimeSessionBootstrapResult {
    ephemeralKey: string;
    model: string;
    targetLanguage: string;
    voiceId: string;
    roleName: string;
    greeting: string;
}

interface SpeakingLessonContentShape {
    missionTitle?: string;
    missionDescription?: string;
    aiConfig?: {
        roleName?: string;
        firstMessage?: string;
        systemInstruction?: string;
    };
}

interface GenerateMissionResult {
    missionTitle: string;
    missionDescription: string;
    aiConfig: {
        roleName: string;
        voiceId: string;
        firstMessage: string;
        systemInstruction: string;
    };
    hints: Array<{ vi: string; en: string }>;
}

export const speakingService = {
    createRealtimeSession: async (lessonId: string): Promise<RealtimeSessionBootstrapResult> => {
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

        const selectedVoice = resolveRealtimeVoice(
            lessonContext.aiConfig.voiceId || lessonContext.preferredVoiceId,
            env.OPENAI_REALTIME_VOICE,
        );
        const transcriptionLanguage = (lessonContext.targetLanguage.trim().split('-')[0] || 'en').toLowerCase();
        const turnDetection = resolveTurnDetection();

        let response: globalThis.Response;
        try {
            response = await fetch('https://api.openai.com/v1/realtime/sessions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: env.OPENAI_REALTIME_MODEL,
                    voice: selectedVoice,
                    instructions: systemPrompt,
                    max_response_output_tokens: env.OPENAI_REALTIME_MAX_OUTPUT_TOKENS,
                    input_audio_transcription: {
                        model: env.OPENAI_REALTIME_TRANSCRIPT_MODEL,
                        language: transcriptionLanguage,
                    },
                    input_audio_noise_reduction: {
                        type: env.OPENAI_REALTIME_NOISE_REDUCTION,
                    },
                    ...(turnDetection ? { turn_detection: turnDetection } : {}),
                }),
            });
        } catch (error) {
            logger.error('[SpeakingService] Failed to call OpenAI realtime sessions API', { error });
            throw new AppError('Không thể kết nối OpenAI Realtime. Vui lòng thử lại sau.', HttpStatus.BAD_GATEWAY);
        }

        const responseText = await response.text();
        if (!response.ok) {
            logger.error('[SpeakingService] OpenAI realtime sessions API returned non-OK', {
                status: response.status,
                body: responseText,
            });
            throw new AppError('Không thể tạo phiên realtime. Vui lòng thử lại sau.', HttpStatus.BAD_GATEWAY);
        }

        let parsed: { client_secret?: { value?: string } };
        try {
            parsed = JSON.parse(responseText) as { client_secret?: { value?: string } };
        } catch {
            logger.error('[SpeakingService] Invalid JSON from OpenAI realtime sessions API', { body: responseText });
            throw new AppError('OpenAI Realtime trả về dữ liệu không hợp lệ.', HttpStatus.BAD_GATEWAY);
        }

        const ephemeralKey = parsed.client_secret?.value?.trim();
        if (!ephemeralKey) {
            logger.error('[SpeakingService] Missing client_secret.value from OpenAI realtime sessions API', { body: responseText });
            throw new AppError('Không lấy được khóa phiên realtime từ OpenAI.', HttpStatus.BAD_GATEWAY);
        }

        return {
            ephemeralKey,
            model: env.OPENAI_REALTIME_MODEL,
            targetLanguage: lessonContext.targetLanguage,
            voiceId: selectedVoice,
            roleName: lessonContext.aiConfig.roleName,
            greeting: lessonContext.aiConfig.firstMessage,
        };
    },

    getContent: async (lessonId: string) => {
        const lesson = await Lesson.findOne({ _id: lessonId, type: 'SPEAKING' });
        if (!lesson) {
            throw new AppError('Speaking lesson not found', 404);
        }

        return lesson.content;
    },

    saveContent: async (lessonId: string, payload: SaveSpeakingContentBody) => {
        const lesson = await Lesson.findOneAndUpdate(
            { _id: lessonId, type: 'SPEAKING' },
            {
                $set: {
                    content: {
                        type: 'SPEAKING',
                        ...payload,
                    },
                },
            },
            { new: true, runValidators: true },
        );

        if (!lesson) {
            throw new AppError('Speaking lesson not found', 404);
        }

        return lesson.content;
    },

    generateMission: async (lessonId: string, topic: string, context: string): Promise<GenerateMissionResult> => {
        const lesson = await Lesson.findOne({ _id: lessonId, type: 'SPEAKING' }).select('title').lean();
        if (!lesson) {
            throw new AppError('Speaking lesson not found', 404);
        }

        const prompt = `You are an expert language teaching content designer.
Create a complete speaking lesson mission configuration for a language learning app.

Lesson title: "${lesson.title}"
Topic provided by teacher: "${topic}"
Additional context: "${context}"

IMPORTANT: The app places the learner in a REAL-WORLD immersive roleplay scenario.
The AI character must never act as a language teacher or pronunciation coach.
It must stay fully in character as a real person in the situation.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "missionTitle": "short, engaging mission title (1 sentence)",
  "missionDescription": "clear description of what the learner must do (2-4 sentences)",
  "aiConfig": {
    "roleName": "name and role of the AI character that fits the scenario (e.g. 'Officer Kim — Immigration Officer')",
    "voiceId": "marin",
    "firstMessage": "natural, in-character opening line the AI character will say to start the real-world scenario",
    "systemInstruction": "You are [role] in a real-world scenario. Stay FULLY in character at all times. You are NOT a language teacher. React naturally as a real [role] would — if the learner is unclear, ask them to repeat in character (e.g. 'Sorry, could you repeat that?'), never correct pronunciation or teach. Move the conversation forward naturally. Keep responses short and conversational. [Add 3-5 sentences describing the specific scenario, what the character wants from the learner, and how the conversation should progress.]"
  },
  "hints": [
    { "vi": "Vietnamese hint for the learner", "en": "English translation of the hint" },
    { "vi": "Vietnamese hint 2", "en": "English hint 2" },
    { "vi": "Vietnamese hint 3", "en": "English hint 3" }
  ]
}`;

        let raw = '{}';
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert language teaching content designer. Return ONLY valid JSON.',
                    },
                    { role: 'user', content: prompt },
                ],
            });
            raw = completion.choices[0]?.message?.content ?? '{}';
        } catch (err) {
            logger.error('[SpeakingService] OpenAI error in generateMission', { err });
            throw new AppError(
                'Không thể tạo nội dung Speaking bằng AI. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        let parsed: GenerateMissionResult;
        try {
            parsed = JSON.parse(raw) as GenerateMissionResult;
        } catch {
            logger.error('[SpeakingService] Failed to parse OpenAI JSON response', { raw });
            throw new AppError(
                'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return {
            missionTitle: parsed.missionTitle ?? topic,
            missionDescription: parsed.missionDescription ?? context,
            aiConfig: {
                roleName: parsed.aiConfig?.roleName ?? 'Language Coach',
                voiceId: 'marin',
                firstMessage: parsed.aiConfig?.firstMessage ?? 'Hello! Let\'s begin.',
                systemInstruction: parsed.aiConfig?.systemInstruction ?? '',
            },
            hints: Array.isArray(parsed.hints) ? parsed.hints : [],
        };
    },

    testCoach: async (_lessonId: string, _userMessage: string) => {
        // @v2-deferred: testCoach is deferred to V2 (openai-coach.engine text mode)
        throw new AppError('testCoach is not available in V1.', 501);
    },
};
