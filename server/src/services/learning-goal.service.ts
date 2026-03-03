import OpenAI from 'openai';
import redisClient from '../config/redis.js';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';
import type { ILearningGoal } from '../models/mongo/learning-goal.model.js';
import { User } from '../models/mongo/user.model.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';
import type {
    CreateLearningGoalBody,
    DuplicateLearningGoalBody,
    GetLearningGoalsQuery,
    TestLearningGoalBody,
    UpdateLearningGoalBody,
} from '../validations/learning-goal.validation.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

interface LearningGoalListItem extends ILearningGoal {
    stats: {
        activeUsers: number;
    };
}

interface LearningGoalListResult {
    goals: LearningGoalListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

interface TestLearningGoalResult {
    aiResponse: string;
    debug: {
        model: string;
        finishReason: string;
        latencyMs: number;
        tokensUsed: number;
        promptLength: number;
    };
}

export class LearningGoalService {
    private readonly openAIClient: OpenAI;
    private readonly testModel = 'gpt-5.1-2025-11-13';

    constructor(
        private readonly learningGoalRepo: LearningGoalMongoRepository,
    ) {
        this.openAIClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }

    async getLearningGoals(query: GetLearningGoalsQuery): Promise<LearningGoalListResult> {
        const cacheKey = `learning-goals:list:${query.page}:${query.limit}:${query.search ?? ''}:${query.isActive ?? ''}`;

        const cached = await this.safeGetCache<LearningGoalListResult>(cacheKey);
        if (cached) {
            return cached;
        }

        const filters: {
            page: number;
            limit: number;
            search?: string;
            isActive?: boolean;
        } = {
            page: query.page,
            limit: query.limit,
        };

        if (query.search) {
            filters.search = query.search;
        }

        if (typeof query.isActive === 'boolean') {
            filters.isActive = query.isActive;
        }

        const result = await this.learningGoalRepo.findWithFilters(filters);

        const goalsWithStats = await Promise.all(
            result.goals.map(async (goal) => {
                const activeUsers = await User.countDocuments({ learningGoal: goal.slug });
                return {
                    ...goal,
                    stats: { activeUsers },
                } as LearningGoalListItem;
            }),
        );

        const response: LearningGoalListResult = {
            goals: goalsWithStats,
            pagination: result.pagination,
        };

        await this.safeSetCache(cacheKey, response, 300);

        return response;
    }

    async getLearningGoalBySlug(slug: string): Promise<ILearningGoal> {
        const cacheKey = `learning-goal:${slug}`;

        const cached = await this.safeGetCache<ILearningGoal>(cacheKey);
        if (cached) {
            return cached;
        }

        const goal = await this.learningGoalRepo.findBySlug(slug);

        if (!goal) {
            throw new AppError('Learning goal not found', HttpStatus.NOT_FOUND);
        }

        await this.safeSetCache(cacheKey, goal, 3600);

        return goal;
    }

    async createLearningGoal(payload: CreateLearningGoalBody): Promise<ILearningGoal> {
        const existed = await this.learningGoalRepo.findBySlug(payload.slug);
        if (existed) {
            throw new AppError('Learning goal slug already exists', HttpStatus.BAD_REQUEST);
        }

        const createPayload: Partial<ILearningGoal> = {
            slug: payload.slug,
            title: payload.title,
            systemPrompt: payload.systemPrompt,
            skillWeights: payload.skillWeights,
            ignoredSkills: payload.ignoredSkills,
            isActive: payload.isActive,
            ...(payload.iconUrl ? { iconUrl: payload.iconUrl } : {}),
        };

        const goal = await this.learningGoalRepo.create(createPayload);
        await this.invalidateLearningGoalCaches(payload.slug);
        return goal;
    }

    async updateLearningGoal(slug: string, payload: UpdateLearningGoalBody): Promise<ILearningGoal> {
        const updated = await this.learningGoalRepo.updateBySlug(slug, payload as Partial<ILearningGoal>);

        if (!updated) {
            throw new AppError('Learning goal not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateLearningGoalCaches(slug);

        return updated;
    }

    async duplicateLearningGoal(slug: string, payload: DuplicateLearningGoalBody): Promise<ILearningGoal> {
        const targetExisted = await this.learningGoalRepo.findBySlug(payload.newSlug);
        if (targetExisted) {
            throw new AppError('Target slug already exists', HttpStatus.BAD_REQUEST);
        }

        try {
            const duplicated = await this.learningGoalRepo.duplicateBySlug(slug, payload.newSlug, payload.newTitle);
            await this.invalidateLearningGoalCaches(payload.newSlug);
            return duplicated;
        } catch (error) {
            logger.error('Duplicate learning goal failed', { slug, error });
            throw new AppError('Unable to duplicate learning goal', HttpStatus.BAD_REQUEST);
        }
    }

    async toggleLearningGoalStatus(slug: string): Promise<ILearningGoal> {
        const updated = await this.learningGoalRepo.toggleStatus(slug);

        if (!updated) {
            throw new AppError('Learning goal not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateLearningGoalCaches(slug);

        return updated;
    }

    async testLearningGoalConfig(payload: TestLearningGoalBody): Promise<TestLearningGoalResult> {
        const startedAt = Date.now();

        const systemInstruction = `${payload.draftConfig.systemPrompt}\n\nIgnored skills: ${(payload.draftConfig.ignoredSkills ?? []).join(', ') || 'None'}.`;
        const userMessage = payload.scenario.context
            ? `[Context] ${payload.scenario.context}\n[Student] ${payload.scenario.userInput}`
            : payload.scenario.userInput;

        let completion: Awaited<ReturnType<typeof this.openAIClient.chat.completions.create>>;
        try {
            completion = await this.openAIClient.chat.completions.create(
                {
                    model: this.testModel,
                    max_completion_tokens: 512,
                    messages: [
                        {
                            role: 'system',
                            content: systemInstruction,
                        },
                        {
                            role: 'user',
                            content: `Skill weights: ${JSON.stringify(payload.draftConfig.skillWeights)}\n\n${userMessage}`,
                        },
                    ],
                },
                { timeout: 30_000 },
            );
        } catch (err) {
            // OpenAI SDK errors expose .status and .error.message with full detail
            const isOpenAIError = err != null && typeof err === 'object' && 'status' in err;
            const httpStatus = isOpenAIError ? (err as { status: number }).status : undefined;
            const openAIBody = isOpenAIError ? (err as { error?: { message?: string } }).error : undefined;
            const message = openAIBody?.message ?? (err instanceof Error ? err.message : String(err));
            logger.error('OpenAI test call failed', {
                model: this.testModel,
                httpStatus,
                error: message,
                fullError: isOpenAIError ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : undefined,
            });
            throw new AppError(`OpenAI error (${httpStatus ?? 'unknown'}): ${message}`, HttpStatus.BAD_GATEWAY);
        }

        const choice = completion.choices[0];
        const aiResponse = choice?.message?.content?.trim();
        const finishReason = choice?.finish_reason ?? 'unknown';

        if (!aiResponse) {
            const refusal = choice?.message?.refusal;
            logger.warn('OpenAI returned empty content', {
                model: completion.model,
                finishReason,
                refusal,
                usage: completion.usage,
            });
            // 'length' means the response was cut mid-generation — treat as a
            // configuration issue, not an upstream error.
            const reason = refusal ?? `finish_reason: ${finishReason}`;
            const status =
                finishReason === 'length'
                    ? HttpStatus.BAD_REQUEST
                    : HttpStatus.UNPROCESSABLE_ENTITY;
            throw new AppError(
                finishReason === 'length'
                    ? 'AI response was cut off (token limit reached). Try shortening the system prompt or the scenario input.'
                    : `AI did not return a response (${reason})`,
                status,
            );
        }

        return {
            aiResponse,
            debug: {
                model: completion.model,
                finishReason,
                latencyMs: Date.now() - startedAt,
                tokensUsed: completion.usage?.total_tokens ?? 0,
                promptLength: systemInstruction.length,
            },
        };
    }

    private async invalidateLearningGoalCaches(slug: string): Promise<void> {
        await Promise.all([
            this.safeDeleteCache(`learning-goal:${slug}`),
            this.safeDeleteByPattern('learning-goals:list:*'),
        ]);
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
            logger.error('Redis get cache failed', { key, error });
            return null;
        }
    }

    private async safeSetCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
            logger.error('Redis set cache failed', { key, error });
        }
    }

    private async safeDeleteCache(key: string): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error('Redis delete cache failed', { key, error });
        }
    }

    private async safeDeleteByPattern(pattern: string): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error('Redis delete by pattern failed', { pattern, error });
        }
    }
}

export const learningGoalService = new LearningGoalService(
    new LearningGoalMongoRepository(),
);
