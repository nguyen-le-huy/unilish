import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import type { ICourseSeries } from '../models/mongo/course-series.model.js';
import { CourseSeriesMongoRepository } from '../repositories/mongo/course-series.mongo.repository.js';
import { vectorSyncQueue } from '../jobs/queues/vector-sync.queue.js';
import type {
    CreateCourseSeriesBody,
    GetCourseSeriesListQuery,
    UpdateCourseSeriesBody,
} from '../validations/course-series.validation.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

// ─── Result type definitions ─────────────────────────────────────────────────

interface SeriesListResult {
    series: ICourseSeries[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CourseSeriesService {
    constructor(
        private readonly seriesRepo: CourseSeriesMongoRepository,
    ) {}

    // ─── Read ──────────────────────────────────────────────────────────────

    async getSeriesList(query: GetCourseSeriesListQuery): Promise<SeriesListResult> {
        // Build a deterministic cache key from all filter dimensions
        const cacheKey = [
            'course-series:list',
            query.page,
            query.limit,
            query.search ?? '',
            query.isActive ?? '',
            query.languageId ?? '',
            query.learningGoalId ?? '',
        ].join(':');

        const cached = await this.safeGetCache<SeriesListResult>(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await this.seriesRepo.findWithFilters({
            page: query.page,
            limit: query.limit,
            ...(query.search && { search: query.search }),
            ...(typeof query.isActive === 'boolean' && { isActive: query.isActive }),
            ...(query.languageId && { languageId: query.languageId }),
            ...(query.learningGoalId && { learningGoalId: query.learningGoalId }),
        });

        await this.safeSetCache(cacheKey, result, 60);

        return result;
    }

    async getSeriesBySlug(slug: string): Promise<ICourseSeries> {
        const cacheKey = `course-series:detail:${slug}`;

        const cached = await this.safeGetCache<ICourseSeries>(cacheKey);
        if (cached) {
            return cached;
        }

        const series = await this.seriesRepo.findBySlug(slug);

        if (!series) {
            throw new AppError('Course series not found', HttpStatus.NOT_FOUND);
        }

        await this.safeSetCache(cacheKey, series, 3600);

        return series;
    }

    // ─── Write ─────────────────────────────────────────────────────────────

    async createSeries(body: CreateCourseSeriesBody): Promise<ICourseSeries> {
        const slugTaken = await this.seriesRepo.existsBySlug(body.slug);
        if (slugTaken) {
            throw new AppError(
                `Slug "${body.slug}" đã tồn tại. Hãy chọn slug khác.`,
                HttpStatus.CONFLICT,
            );
        }

        const created = await this.seriesRepo.create(body as unknown as Partial<ICourseSeries>);
        await this.invalidateListCaches();
        this.enqueueVectorSync(String(created._id), 'upsert', 'createSeries');

        return created;
    }

    async updateSeries(slug: string, body: UpdateCourseSeriesBody): Promise<ICourseSeries> {
        const updated = await this.seriesRepo.updateBySlug(slug, body as unknown as Partial<ICourseSeries>);

        if (!updated) {
            throw new AppError('Course series not found', HttpStatus.NOT_FOUND);
        }

        await this.invalidateAllCaches(slug);
        this.enqueueVectorSync(String(updated._id), 'upsert', 'updateSeries');

        return updated;
    }

    async toggleSeriesStatus(slug: string): Promise<ICourseSeries> {
        const current = await this.seriesRepo.findBySlug(slug);

        if (!current) {
            throw new AppError('Course series not found', HttpStatus.NOT_FOUND);
        }

        const updated = await this.seriesRepo.updateBySlug(slug, {
            isActive: !current.isActive,
        } as Partial<ICourseSeries>);

        // updated is guaranteed non-null here since we found it above
        await this.invalidateAllCaches(slug);
        this.enqueueVectorSync(String(updated!._id), 'upsert', 'toggleSeriesStatus');

        return updated!;
    }

    async deleteSeries(slug: string): Promise<void> {
        const series = await this.seriesRepo.findBySlug(slug);

        if (!series) {
            throw new AppError('Course series not found', HttpStatus.NOT_FOUND);
        }

        if (series.totalCourses > 0) {
            throw new AppError(
                `Không thể xóa series "${series.title}" vì còn ${series.totalCourses} khóa học bên trong. Hãy xóa hoặc di chuyển các khóa học trước.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.seriesRepo.deleteBySlug(slug);
        await this.invalidateAllCaches(slug);
        this.enqueueVectorSync(String(series._id), 'delete', 'deleteSeries');
    }

    // ─── Cache helpers ──────────────────────────────────────────────────────

    private async invalidateAllCaches(slug: string): Promise<void> {
        await Promise.all([
            this.safeDeleteCache(`course-series:detail:${slug}`),
            this.invalidateListCaches(),
        ]);
    }

    private async invalidateListCaches(): Promise<void> {
        await this.safeDeleteByPattern('course-series:list:*');
    }

    private async safeGetCache<T>(key: string): Promise<T | null> {
        if (!redisClient.isOpen) {
            return null;
        }
        try {
            const raw = await redisClient.get(key);
            if (!raw) return null;
            return JSON.parse(raw) as T;
        } catch (error) {
            logger.error('Redis get cache failed', { key, error });
            return null;
        }
    }

    private async safeSetCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        if (!redisClient.isOpen) return;
        try {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
            logger.error('Redis set cache failed', { key, error });
        }
    }

    private async safeDeleteCache(key: string): Promise<void> {
        if (!redisClient.isOpen) return;
        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error('Redis delete cache failed', { key, error });
        }
    }

    private async safeDeleteByPattern(pattern: string): Promise<void> {
        if (!redisClient.isOpen) return;
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error('Redis delete by pattern failed', { pattern, error });
        }
    }

    private enqueueVectorSync(seriesId: string, action: 'upsert' | 'delete', source: string): void {
        const jobName = `course-series:${action}:${seriesId}:${Date.now()}`;
        void vectorSyncQueue
            .add(jobName, { seriesId, action })
            .then((job) => {
                logger.info('CourseSeries vector sync queued', {
                    seriesId,
                    action,
                    source,
                    jobId: job.id,
                });
            })
            .catch((error: unknown) => {
                logger.error('CourseSeries vector sync queue failed', { seriesId, action, source, error });
            });
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const courseSeriesService = new CourseSeriesService(
    new CourseSeriesMongoRepository(),
);
