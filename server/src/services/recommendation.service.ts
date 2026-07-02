import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import { CourseVectorRepository } from '../repositories/vector/course.vector.repository.js';
import { EmbeddingService, embeddingService } from './embedding.service.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { UserMongoRepository } from '../repositories/mongo/user.mongo.repository.js';
import { LanguageMongoRepository } from '../repositories/mongo/language.mongo.repository.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';

const RECOMMENDATION_CACHE_TTL_SECONDS = 86_400;
const RECOMMENDATION_CACHE_PREFIX = 'recommendations:user';
// Bump to v3 to invalidate old Series-based cache
const RECOMMENDATION_CACHE_SIGNATURE_VERSION = 'v3';

interface RecommendationCacheEntry {
    profileSignature: string;
    data: RecommendedCourseDto[];
}

/** New Course-based recommendation DTO */
export interface RecommendedCourseDto {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl: string;
    level: string;
    totalUnits: number;
    score: number;
}

/** @deprecated Kept for backward-compat during migration. Use RecommendedCourseDto. */
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
        private readonly courseVectorRepo: CourseVectorRepository,
        private readonly embeddings: EmbeddingService,
    ) { }

    /**
     * Get recommended Courses for a user.
     * Uses Course vectors indexed directly in Pinecone.
     */
    async getRecommendedCourses(userId: string, topK = 6): Promise<RecommendedCourseDto[]> {
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

        // Try exact level + one above
        let matches = await this.courseVectorRepo.findRecommendedCourses(
            {
                languageId: learningLanguageId,
                learningGoalId,
                userLevel: currentLevel,
                isActive: true,
            },
            queryVector,
            topK,
        );

        // Fallback 1: Keep language + goal, relax level constraints
        if (matches.length === 0) {
            matches = await this.courseVectorRepo.findRecommendedCourses(
                {
                    languageId: learningLanguageId,
                    learningGoalId,
                    isActive: true,
                },
                queryVector,
                topK,
            );
        }

        // Fallback 2: Keep only language as hard filter
        if (matches.length === 0) {
            matches = await this.courseVectorRepo.findRecommendedCourses(
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
                level: match.metadata.level,
                totalUnits: match.metadata.totalUnits,
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

    private async getCachedRecommendations(cacheKey: string, signature: string): Promise<RecommendedCourseDto[] | null> {
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
    new CourseVectorRepository(),
    embeddingService,
);
