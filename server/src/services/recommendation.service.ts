import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import { CourseSeriesVectorRepository } from '../repositories/vector/course-series.vector.repository.js';
import {
    COURSE_SERIES_LEVEL_TO_NUMBER,
    type CourseSeriesLevel,
} from '../models/vector/course-series-vector.js';
import { EmbeddingService, embeddingService } from './embedding.service.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { UserMongoRepository } from '../repositories/mongo/user.mongo.repository.js';
import { LanguageMongoRepository } from '../repositories/mongo/language.mongo.repository.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';

const RECOMMENDATION_CACHE_TTL_SECONDS = 86_400;
const RECOMMENDATION_CACHE_PREFIX = 'recommendations:user';
const RECOMMENDATION_CACHE_SIGNATURE_VERSION = 'v2';

interface RecommendationCacheEntry {
    profileSignature: string;
    data: RecommendedSeriesDto[];
}

export interface RecommendedSeriesDto {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl: string;
    totalCourses: number;
    levelMin: string;
    levelMax: string;
    score: number;
}

const normalizeObjectId = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
        const maybeValue = value as {
            _id?: unknown;
            toHexString?: () => string;
            toString?: () => string;
        };

        if (typeof maybeValue.toHexString === 'function') {
            const parsed = maybeValue.toHexString().trim();
            if (parsed.length > 0) {
                return parsed;
            }
        }

        if (typeof maybeValue.toString === 'function') {
            const parsed = maybeValue.toString().trim();
            if (parsed && parsed !== '[object Object]') {
                return parsed;
            }
        }

        if ('_id' in maybeValue && maybeValue._id !== value) {
            return normalizeObjectId(maybeValue._id);
        }
    }

    return null;
};

export class RecommendationService {
    constructor(
        private readonly userRepo: UserMongoRepository,
        private readonly languageRepo: LanguageMongoRepository,
        private readonly learningGoalRepo: LearningGoalMongoRepository,
        private readonly seriesVectorRepo: CourseSeriesVectorRepository,
        private readonly embeddings: EmbeddingService,
    ) { }

    async getRecommendedSeries(userId: string, topK = 6): Promise<RecommendedSeriesDto[]> {
        const user = await this.userRepo.findRecommendationProfileById(userId);

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        const currentLevel = user.currentLevel;
        const learningLanguageId = normalizeObjectId(user.learningLanguageId);
        const learningGoalId = normalizeObjectId(user.learningGoalId);

        if (!learningLanguageId || !learningGoalId || !currentLevel || currentLevel === 'A0') {
            return [];
        }

        const userLevelNum = COURSE_SERIES_LEVEL_TO_NUMBER[currentLevel as CourseSeriesLevel];
        if (typeof userLevelNum !== 'number') {
            return [];
        }

        const cacheKey = this.getCacheKey(userId);
        const profileSignature = `${learningLanguageId}:${learningGoalId}:${currentLevel}:${RECOMMENDATION_CACHE_SIGNATURE_VERSION}`;

        const cached = await this.getCachedRecommendations(cacheKey, profileSignature);
        if (cached) {
            return cached;
        }

        const [language, learningGoal] = await Promise.all([
            this.languageRepo.findLiteById(learningLanguageId),
            this.learningGoalRepo.findLiteById(learningGoalId),
        ]);

        const queryText = this.embeddings.buildUserQueryText({
            currentLevel,
            languageName: language?.nativeName ?? language?.name ?? null,
            learningGoalName: learningGoal?.title ?? null,
        });

        const queryVector = await this.embeddings.embedText(queryText);

        let matches = await this.seriesVectorRepo.findRecommendedSeries(
            {
                languageId: learningLanguageId,
                learningGoalId,
                userLevelNum,
                isActive: true,
            },
            queryVector,
            topK,
        );

        // Fallback 1: Keep language + goal, relax level constraints.
        if (matches.length === 0) {
            matches = await this.seriesVectorRepo.findRecommendedSeries(
                {
                    languageId: learningLanguageId,
                    learningGoalId,
                    isActive: true,
                },
                queryVector,
                topK,
            );
        }

        // Fallback 2: Keep only language as hard filter.
        if (matches.length === 0) {
            matches = await this.seriesVectorRepo.findRecommendedSeries(
                {
                    languageId: learningLanguageId,
                    isActive: true,
                },
                queryVector,
                topK,
            );
        }

        const data = matches
            .map((match) => ({
                id: match.id,
                title: match.metadata.title,
                slug: match.metadata.slug,
                description: match.metadata.description,
                thumbnailUrl: match.metadata.thumbnailUrl,
                totalCourses: match.metadata.totalCourses,
                levelMin: match.metadata.levelMin,
                levelMax: match.metadata.levelMax,
                score: match.score,
            }))
            .sort((a, b) => b.score - a.score);

        if (data.length > 0) {
            await this.setCachedRecommendations(cacheKey, {
                profileSignature,
                data,
            });
        }

        return data;
    }

    async invalidateRecommendationsByUserId(userId: string): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        const cacheKey = this.getCacheKey(userId);
        try {
            await redisClient.del(cacheKey);
        } catch (error) {
            logger.error('Failed to invalidate recommendation cache', { userId, error });
        }
    }

    private getCacheKey(userId: string): string {
        return `${RECOMMENDATION_CACHE_PREFIX}:${userId}`;
    }

    private async getCachedRecommendations(cacheKey: string, signature: string): Promise<RecommendedSeriesDto[] | null> {
        if (!redisClient.isOpen) {
            return null;
        }

        try {
            const cachedRaw = await redisClient.get(cacheKey);
            if (!cachedRaw) {
                return null;
            }

            const parsed = JSON.parse(cachedRaw) as RecommendationCacheEntry;
            if (parsed.profileSignature !== signature) {
                return null;
            }

            return parsed.data;
        } catch (error) {
            logger.error('Failed to read recommendation cache', { cacheKey, error });
            return null;
        }
    }

    private async setCachedRecommendations(cacheKey: string, value: RecommendationCacheEntry): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            await redisClient.setEx(cacheKey, RECOMMENDATION_CACHE_TTL_SECONDS, JSON.stringify(value));
        } catch (error) {
            logger.error('Failed to write recommendation cache', { cacheKey, error });
        }
    }
}

export const recommendationService = new RecommendationService(
    new UserMongoRepository(),
    new LanguageMongoRepository(),
    new LearningGoalMongoRepository(),
    new CourseSeriesVectorRepository(),
    embeddingService,
);