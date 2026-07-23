import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import type { ILearningGoal } from '../models/mongo/learning-goal.model.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';
import type {
    CreateLearningGoalBody,
    GetLearningGoalsQuery,
    UpdateLearningGoalBody,
} from '../validations/learning-goal.validation.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

interface LearningGoalListResult {
    goals: ILearningGoal[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export class LearningGoalService {
    constructor(
        private readonly learningGoalRepo: LearningGoalMongoRepository,
    ) { }

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

        const response: LearningGoalListResult = {
            goals: result.goals,
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
            supportedLanguages: payload.supportedLanguages as unknown as ILearningGoal['supportedLanguages'],
            isActive: payload.isActive,
            ...(payload.description ? { description: payload.description } : {}),
            ...(payload.targetAudience ? { targetAudience: payload.targetAudience } : {}),
            ...(payload.iconUrl ? { iconUrl: payload.iconUrl } : {}),
        };

        const goal = await this.learningGoalRepo.create(createPayload);
        await this.invalidateLearningGoalCaches(payload.slug);
        return goal;
    }

    async updateLearningGoal(slug: string, payload: UpdateLearningGoalBody): Promise<ILearningGoal> {
        const updated = await this.learningGoalRepo.updateBySlug(slug, payload as unknown as Partial<ILearningGoal>);

        if (!updated) {
            throw new AppError('Learning goal not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateLearningGoalCaches(slug);

        return updated;
    }

    async toggleLearningGoalStatus(slug: string): Promise<ILearningGoal> {
        const updated = await this.learningGoalRepo.toggleStatus(slug);

        if (!updated) {
            throw new AppError('Learning goal not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateLearningGoalCaches(slug);

        return updated;
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
