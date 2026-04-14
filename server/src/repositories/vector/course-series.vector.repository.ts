import { BaseVectorRepository } from '../base/base.vector.repository.js';
import {
    COURSE_SERIES_LEVEL_TO_NUMBER,
    type CourseSeriesLevel,
    type CourseSeriesVectorMetadata,
} from '../../models/vector/course-series-vector.js';
import { parseCourseSeriesLevelRange } from '../../models/vector/course-series-vector.js';
import { getCourseSeriesIndex } from '../../config/database.pinecone.js';
import { logger } from '../../utils/logger.js';
import type { SeriesAIAnalysis } from '../../services/ai-analysis.service.js';

export interface RecommendedSeriesFilter {
    languageId: string;
    learningGoalId?: string;
    userLevelNum?: number;
    isActive?: boolean;
}

export interface RecommendedSeriesMatch {
    id: string;
    score: number;
    metadata: CourseSeriesVectorMetadata;
}

interface CourseSeriesVectorInput {
    _id: unknown;
    languageId: unknown;
    learningGoalId: unknown;
    isActive: boolean;
    title: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    totalCourses: number;
}

interface UpsertEnrichedInput {
    series: CourseSeriesVectorInput;
    embedding: number[];
    aiAnalysis: SeriesAIAnalysis | null;
    analyzedAt?: Date;
}

const normalizeMongoId = (value: unknown): string => {
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
            const normalized = maybeValue.toHexString().trim();
            if (normalized.length > 0) {
                return normalized;
            }
        }

        if (typeof maybeValue.toString === 'function') {
            const normalized = maybeValue.toString().trim();
            if (normalized && normalized !== '[object Object]') {
                return normalized;
            }
        }

        if ('_id' in maybeValue && maybeValue._id !== value) {
            return normalizeMongoId(maybeValue._id);
        }
    }

    throw new Error('Invalid Mongo id for CourseSeries vector operation');
};

export class CourseSeriesVectorRepository extends BaseVectorRepository<CourseSeriesVectorMetadata> {
    constructor() {
        super(getCourseSeriesIndex);
    }

    async upsertSeries(
        series: CourseSeriesVectorInput,
        embedding: number[],
        aiAnalysis: SeriesAIAnalysis | null = null,
    ): Promise<void> {
        const seriesId = normalizeMongoId(series._id);
        const metadata = this.buildMetadata(series, aiAnalysis, aiAnalysis ? new Date() : undefined);

        await this.upsert([
            {
                id: seriesId,
                values: embedding,
                metadata,
            },
        ]);

        logger.info('✅ Upserted CourseSeries vector', { seriesId, slug: series.slug });
    }

    async upsertBatch(
        seriesWithEmbeddings: Array<{
            series: CourseSeriesVectorInput;
            embedding: number[];
        }>,
    ): Promise<void> {
        if (seriesWithEmbeddings.length === 0) {
            return;
        }

        const vectors = seriesWithEmbeddings.map(({ series, embedding }) => ({
            id: normalizeMongoId(series._id),
            values: embedding,
            metadata: this.buildMetadata(series, null),
        }));

        await this.upsert(vectors);
        logger.info('✅ Upserted CourseSeries vectors in batch', { count: vectors.length });
    }

    async upsertEnrichedBatch(items: UpsertEnrichedInput[]): Promise<void> {
        if (items.length === 0) {
            return;
        }

        const vectors = items.map(({ series, embedding, aiAnalysis, analyzedAt }) => ({
            id: normalizeMongoId(series._id),
            values: embedding,
            metadata: this.buildMetadata(series, aiAnalysis, analyzedAt ?? (aiAnalysis ? new Date() : undefined)),
        }));

        await this.upsert(vectors);
        logger.info('✅ Upserted enriched CourseSeries vectors in batch', { count: vectors.length });
    }

    async deleteSeries(seriesId: string): Promise<void> {
        await this.delete([seriesId]);
        logger.info('✅ Deleted CourseSeries vector', { seriesId });
    }

    async findRecommendedSeries(
        filter: RecommendedSeriesFilter,
        queryVector: number[],
        topK: number = 6,
    ): Promise<RecommendedSeriesMatch[]> {
        const metadataFilter: Record<string, unknown> = {
            languageId: { $eq: filter.languageId },
            isActive: { $eq: filter.isActive ?? true },
        };

        if (filter.learningGoalId) {
            metadataFilter.learningGoalId = { $eq: filter.learningGoalId };
        }
        if (typeof filter.userLevelNum === 'number') {
            metadataFilter.levelMinNum = { $lte: filter.userLevelNum };
            metadataFilter.levelMaxNum = { $gte: filter.userLevelNum };
        }

        const queryResult = await this.query(queryVector, {
            topK,
            includeMetadata: true,
            includeValues: false,
            filter: metadataFilter,
        });

        return queryResult.matches.flatMap((match) => {
            if (!match.metadata) {
                return [];
            }

            return [{
                id: match.id,
                score: match.score ?? 0,
                metadata: match.metadata as CourseSeriesVectorMetadata,
            }];
        });
    }

    private buildMetadata(
        series: CourseSeriesVectorInput,
        aiAnalysis: SeriesAIAnalysis | null,
        analyzedAt?: Date,
    ): CourseSeriesVectorMetadata {
        const parsedLevelRange = parseCourseSeriesLevelRange(series.title ?? '');
        const hasAiLevelRange = Boolean(
            aiAnalysis
            && COURSE_SERIES_LEVEL_TO_NUMBER[aiAnalysis.levelMin] <= COURSE_SERIES_LEVEL_TO_NUMBER[aiAnalysis.levelMax],
        );
        const levelRange = hasAiLevelRange && aiAnalysis
            ? {
                levelMin: aiAnalysis.levelMin,
                levelMax: aiAnalysis.levelMax,
                levelMinNum: COURSE_SERIES_LEVEL_TO_NUMBER[aiAnalysis.levelMin],
                levelMaxNum: COURSE_SERIES_LEVEL_TO_NUMBER[aiAnalysis.levelMax],
            }
            : parsedLevelRange;
        const description = series.description?.trim() ?? '';
        const thumbnailUrl = series.thumbnailUrl?.trim() ?? '';

        const metadata: CourseSeriesVectorMetadata = {
            languageId: normalizeMongoId(series.languageId),
            learningGoalId: normalizeMongoId(series.learningGoalId),
            isActive: Boolean(series.isActive),
            levelMinNum: levelRange.levelMinNum,
            levelMaxNum: levelRange.levelMaxNum,
            levelMin: levelRange.levelMin as CourseSeriesLevel,
            levelMax: levelRange.levelMax as CourseSeriesLevel,
            title: series.title?.trim() ?? '',
            slug: series.slug?.trim() ?? '',
            description,
            thumbnailUrl,
            totalCourses: Number.isFinite(series.totalCourses) ? series.totalCourses : 0,
        };

        if (aiAnalysis) {
            metadata.aiSummary = aiAnalysis.summary.trim();
            metadata.topics = Array.from(new Set(aiAnalysis.topics.map((topic) => topic.trim()).filter((topic) => topic.length > 0)));
            metadata.skills = Array.from(new Set(aiAnalysis.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0)));
            metadata.tags = Array.from(new Set(aiAnalysis.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)));
            metadata.audience = aiAnalysis.audience;
            metadata.useCase = aiAnalysis.useCase.trim();
            metadata.aiAnalyzedAt = (analyzedAt ?? new Date()).toISOString();
        }

        return metadata;
    }
}
