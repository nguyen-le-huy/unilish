import { BaseVectorRepository } from '../base/base.vector.repository.js';
import {
    COURSE_LEVEL_TO_NUMBER,
    type CourseLevel,
    type CourseVectorMetadata,
} from '../../models/vector/course-vector.js';
import { getCourseIndex } from '../../config/database.pinecone.js';
import { logger } from '../../utils/logger.js';
import type { CourseAIAnalysis } from '../../services/ai-analysis.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendedCourseFilter {
    languageId: string;
    learningGoalId?: string;
    userLevel?: string;
    isActive?: boolean;
}

export interface RecommendedCourseMatch {
    id: string;
    score: number;
    metadata: CourseVectorMetadata;
}

interface CourseVectorInput {
    _id: unknown;
    languageId: unknown;
    learningGoalId: unknown;
    isActive: boolean;
    name: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    level: string;
    totalUnits: number;
}

interface UpsertEnrichedInput {
    course: CourseVectorInput;
    embedding: number[];
    aiAnalysis: CourseAIAnalysis | null;
    analyzedAt?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

    throw new Error('Invalid Mongo id for Course vector operation');
};

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * CourseVectorRepository
 *
 * Uses the existing Pinecone Course Series index during migration.
 * After migration, switch to a dedicated Course index.
 */
export class CourseVectorRepository extends BaseVectorRepository<CourseVectorMetadata> {
    constructor() {
        super(getCourseIndex);
    }

    async upsertCourse(
        course: CourseVectorInput,
        embedding: number[],
        aiAnalysis: CourseAIAnalysis | null = null,
    ): Promise<void> {
        const courseId = normalizeMongoId(course._id);
        const metadata = this.buildMetadata(course, aiAnalysis, aiAnalysis ? new Date() : undefined);

        await this.upsert([
            {
                id: courseId,
                values: embedding,
                metadata,
            },
        ]);

        logger.info('✅ Upserted Course vector', { courseId, slug: course.slug });
    }

    async upsertBatch(
        coursesWithEmbeddings: Array<{
            course: CourseVectorInput;
            embedding: number[];
        }>,
    ): Promise<void> {
        if (coursesWithEmbeddings.length === 0) {
            return;
        }

        const vectors = coursesWithEmbeddings.map(({ course, embedding }) => ({
            id: normalizeMongoId(course._id),
            values: embedding,
            metadata: this.buildMetadata(course, null),
        }));

        await this.upsert(vectors);
        logger.info('✅ Upserted Course vectors in batch', { count: vectors.length });
    }

    async upsertEnrichedBatch(items: UpsertEnrichedInput[]): Promise<void> {
        if (items.length === 0) {
            return;
        }

        const vectors = items.map(({ course, embedding, aiAnalysis, analyzedAt }) => ({
            id: normalizeMongoId(course._id),
            values: embedding,
            metadata: this.buildMetadata(course, aiAnalysis, analyzedAt ?? (aiAnalysis ? new Date() : undefined)),
        }));

        await this.upsert(vectors);
        logger.info('✅ Upserted enriched Course vectors in batch', { count: vectors.length });
    }

    async deleteCourse(courseId: string): Promise<void> {
        await this.delete([courseId]);
        logger.info('✅ Deleted Course vector', { courseId });
    }

    async findRecommendedCourses(
        filter: RecommendedCourseFilter,
        queryVector: number[],
        topK = 6,
    ): Promise<RecommendedCourseMatch[]> {
        const metadataFilter: Record<string, unknown> = {
            languageId: { $eq: filter.languageId },
            isActive: { $eq: filter.isActive ?? true },
        };

        if (filter.learningGoalId) {
            metadataFilter.learningGoalId = { $eq: filter.learningGoalId };
        }

        // Filter by recommended levels (exact match or A0→A1,A2 fallback)
        if (filter.userLevel) {
            metadataFilter.level = this.buildLevelFilter(filter.userLevel);
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

            return [
                {
                    id: match.id,
                    score: match.score ?? 0,
                    metadata: match.metadata as CourseVectorMetadata,
                },
            ];
        });
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private buildLevelFilter(userLevel: string): { $in: string[] } | undefined {
        const upper = userLevel.toUpperCase();
        if (upper === 'A0') {
            return { $in: ['A1', 'A2'] };
        }

        const num = COURSE_LEVEL_TO_NUMBER[upper as CourseLevel];
        if (num === undefined) return undefined;

        const levels = [upper];
        if (num < 6) {
            // Also include the next level
            const nextNum = num + 1;
            const nextEntries = Object.entries(COURSE_LEVEL_TO_NUMBER) as [CourseLevel, number][];
            const next = nextEntries.find(([, v]) => v === nextNum);
            if (next) {
                levels.push(next[0]);
            }
        }
        return { $in: levels };
    }

    private buildMetadata(
        course: CourseVectorInput,
        aiAnalysis: CourseAIAnalysis | null,
        analyzedAt?: Date,
    ): CourseVectorMetadata {
        const levelNum = COURSE_LEVEL_TO_NUMBER[course.level as CourseLevel] ?? 0;
        const description = course.description?.trim() ?? '';
        const thumbnailUrl = course.thumbnailUrl?.trim() ?? '';

        const metadata: CourseVectorMetadata = {
            languageId: normalizeMongoId(course.languageId),
            learningGoalId: normalizeMongoId(course.learningGoalId),
            isActive: Boolean(course.isActive),
            level: course.level as CourseLevel,
            levelNum,
            title: course.name?.trim() ?? '',
            slug: course.slug?.trim() ?? '',
            description,
            thumbnailUrl,
            totalUnits: Number.isFinite(course.totalUnits) ? course.totalUnits : 0,
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
