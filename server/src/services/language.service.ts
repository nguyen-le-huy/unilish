import OpenAI from 'openai';
import redisClient from '../config/redis.js';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';
import { Language, type ILanguage } from '../models/mongo/language.model.js';
import type {
    CreateLanguageBody,
    GetLanguagesQuery,
    TestLanguageVoiceBody,
    UpdateLanguageBody,
} from '../validations/language.validation.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

interface TestVoiceResult {
    mimeType: string;
    audioBase64: string;
}

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

class LanguageService {
    private readonly openAIClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    async getLanguages(query: GetLanguagesQuery): Promise<ILanguage[]> {
        const cacheKey = `languages:list:${String(query.isActive)}:${query.search ?? ''}`;

        const cached = await this.safeGetCache<ILanguage[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const filter: Record<string, unknown> = {};
        if (typeof query.isActive === 'boolean') {
            filter.isActive = query.isActive;
        }
        if (query.search) {
            filter.$or = [
                { name: { $regex: query.search, $options: 'i' } },
                { nativeName: { $regex: query.search, $options: 'i' } },
                { code: { $regex: query.search, $options: 'i' } },
            ];
        }

        const languages = await Language.find(filter).select('-__v').sort({ name: 1 }).lean().exec() as ILanguage[];
        await this.safeSetCache(cacheKey, languages, 600);

        return languages;
    }

    async getLanguageByCode(code: string): Promise<ILanguage> {
        const language = await Language.findOne({ code }).select('-__v').lean().exec() as ILanguage | null;

        if (!language) {
            throw new AppError('Language not found', HttpStatus.NOT_FOUND);
        }

        return language;
    }

    async createLanguage(payload: CreateLanguageBody): Promise<ILanguage> {
        const existed = await Language.findOne({ code: payload.code }).select('_id').lean().exec();
        if (existed) {
            throw new AppError('Language code already exists', HttpStatus.BAD_REQUEST);
        }

        const createPayload: Record<string, unknown> = {
            code: payload.code,
            name: payload.name,
            nativeName: payload.nativeName,
            ttsConfig: {
                provider: payload.ttsConfig.provider,
                speed: payload.ttsConfig.speed,
            },
            isActive: payload.isActive,
        };

        if (payload.flagIconUrl) {
            createPayload.flagIconUrl = payload.flagIconUrl;
        }

        const ttsConfig = createPayload.ttsConfig as Record<string, unknown>;
        if (payload.ttsConfig.voiceId) {
            ttsConfig.voiceId = payload.ttsConfig.voiceId;
        }
        if (payload.ttsConfig.style) {
            ttsConfig.style = payload.ttsConfig.style;
        }

        const created = await Language.create(createPayload);

        await this.invalidateLanguageListCaches();
        return created;
    }

    async updateLanguage(code: string, payload: UpdateLanguageBody): Promise<ILanguage> {
        const current = await Language.findOne({ code }).select('_id ttsConfig').lean().exec();
        if (!current) {
            throw new AppError('Language not found', HttpStatus.NOT_FOUND);
        }

        const updatePayload: Record<string, unknown> = {};

        if (payload.name !== undefined) updatePayload.name = payload.name;
        if (payload.nativeName !== undefined) updatePayload.nativeName = payload.nativeName;
        if (payload.flagIconUrl !== undefined) updatePayload.flagIconUrl = payload.flagIconUrl;
        if (payload.isActive !== undefined) updatePayload.isActive = payload.isActive;

        if (payload.ttsConfig) {
            const nextTtsConfig: Record<string, unknown> = {
                provider: payload.ttsConfig.provider ?? current.ttsConfig.provider,
                speed: payload.ttsConfig.speed ?? current.ttsConfig.speed ?? 1,
            };

            const nextVoiceId = payload.ttsConfig.voiceId ?? current.ttsConfig.voiceId;
            const nextStyle = payload.ttsConfig.style ?? current.ttsConfig.style;

            if (nextVoiceId) {
                nextTtsConfig.voiceId = nextVoiceId;
            }

            if (nextStyle) {
                nextTtsConfig.style = nextStyle;
            }

            updatePayload.ttsConfig = nextTtsConfig;
        }

        const updated = await Language.findOneAndUpdate({ code }, updatePayload, {
            new: true,
            runValidators: true,
        }).select('-__v').lean().exec() as ILanguage | null;

        if (!updated) {
            throw new AppError('Language not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateLanguageListCaches();
        return updated;
    }

    async toggleLanguageStatus(code: string): Promise<ILanguage> {
        const language = await Language.findOne({ code }).select('_id isActive').lean().exec();

        if (!language) {
            throw new AppError('Language not found', HttpStatus.NOT_FOUND);
        }

        const updated = await Language.findByIdAndUpdate(language._id, { isActive: !language.isActive }, {
            new: true,
            runValidators: true,
        }).select('-__v').lean().exec() as ILanguage | null;

        if (!updated) {
            throw new AppError('Language not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateLanguageListCaches();
        return updated;
    }

    async testVoice(payload: TestLanguageVoiceBody): Promise<TestVoiceResult> {
        if (payload.provider !== 'OPENAI') {
            throw new AppError('Test voice currently supports OPENAI provider only', HttpStatus.BAD_REQUEST);
        }

        if (!OPENAI_VOICES.includes(payload.voiceId as (typeof OPENAI_VOICES)[number])) {
            throw new AppError('Invalid OpenAI voice ID', HttpStatus.BAD_REQUEST);
        }

        const speed = payload.speed;
        const mp3 = await this.openAIClient.audio.speech.create({
            model: 'tts-1',
            voice: payload.voiceId as (typeof OPENAI_VOICES)[number],
            input: payload.text,
            speed,
            response_format: 'mp3',
        });

        const arrayBuffer = await mp3.arrayBuffer();
        const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

        return {
            mimeType: 'audio/mpeg',
            audioBase64,
        };
    }

    private async invalidateLanguageListCaches(): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            const keys = await redisClient.keys('languages:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error('Invalidate language cache failed', { error });
        }
    }

    private async safeGetCache<T>(key: string): Promise<T | null> {
        if (!redisClient.isOpen) {
            return null;
        }

        try {
            const raw = await redisClient.get(key);
            if (!raw) {
                return null;
            }

            return JSON.parse(raw) as T;
        } catch (error) {
            logger.error('Get language cache failed', { key, error });
            return null;
        }
    }

    private async safeSetCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
        } catch (error) {
            logger.error('Set language cache failed', { key, error });
        }
    }
}

export const languageService = new LanguageService();
