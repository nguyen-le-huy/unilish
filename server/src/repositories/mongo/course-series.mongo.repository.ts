import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { CourseSeries, type ICourseSeries } from '../../models/mongo/course-series.model.js';

// ─── Filter / Result type definitions ────────────────────────────────────────

interface SeriesListFilters {
    page: number;
    limit: number;
    isActive?: boolean;
    search?: string;
    languageId?: string;
    learningGoalId?: string;
}

interface SeriesListResult {
    series: ICourseSeries[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class CourseSeriesMongoRepository extends BaseMongoRepository<ICourseSeries> {
    constructor() {
        super(CourseSeries);
    }

    /**
     * Paginated list with optional filters and populated references.
     * MANDATORY: .lean() + .select() on every read path.
     */
    async findWithFilters(filters: SeriesListFilters): Promise<SeriesListResult> {
        const { page, limit, isActive, search, languageId, learningGoalId } = filters;
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = {};

        if (typeof isActive === 'boolean') {
            query.isActive = isActive;
        }
        if (languageId) {
            query.languageId = languageId;
        }
        if (learningGoalId) {
            query.learningGoalId = learningGoalId;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
            ];
        }

        const [series, total] = await Promise.all([
            this.model
                .find(query)
                .select('-__v')
                .populate('languageId', 'name code flagIconUrl')
                .populate('learningGoalId', 'title slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec() as Promise<ICourseSeries[]>,
            this.model.countDocuments(query),
        ]);

        return {
            series,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find a single series by slug, with populated references.
     */
    async findBySlug(slug: string): Promise<ICourseSeries | null> {
        return this.model
            .findOne({ slug })
            .select('-__v')
            .populate('languageId', 'name code flagIconUrl')
            .populate('learningGoalId', 'title slug')
            .lean()
            .exec() as Promise<ICourseSeries | null>;
    }

    /**
     * Update a series by slug. Returns updated document.
     */
    async updateBySlug(slug: string, data: Partial<ICourseSeries>): Promise<ICourseSeries | null> {
        return this.model
            .findOneAndUpdate({ slug }, data, { new: true, runValidators: true })
            .select('-__v')
            .populate('languageId', 'name code flagIconUrl')
            .populate('learningGoalId', 'title slug')
            .lean()
            .exec() as Promise<ICourseSeries | null>;
    }

    /**
     * Delete a series by slug. Returns true if deleted.
     */
    async deleteBySlug(slug: string): Promise<boolean> {
        const result = await this.model.findOneAndDelete({ slug }).exec();
        return !!result;
    }

    /**
     * Check if a slug is already taken (for create uniqueness guard).
     */
    async existsBySlug(slug: string): Promise<boolean> {
        const count = await this.model.countDocuments({ slug });
        return count > 0;
    }
}
