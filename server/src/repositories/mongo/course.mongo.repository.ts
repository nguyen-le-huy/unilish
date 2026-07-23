import { Course, type ICourse } from '../../models/mongo/course.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import mongoose from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseListFilters {
    languageId?: string | undefined;
    learningGoalId?: string | undefined;
    level?: string | undefined;
    isActive?: boolean | undefined;
    search?: string | undefined;
}

export interface CourseListOptions {
    page: number;
    limit: number;
    sort: 'orderIndex' | 'name' | 'createdAt';
    order: 'asc' | 'desc';
}

export interface CourseListResult {
    courses: ICourse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class CourseMongoRepository extends BaseMongoRepository<ICourse> {
    constructor() {
        super(Course);
    }

    /**
     * Paginated, filterable, sortable list of courses.
     * Replaces the old findBySeriesId.
     */
    async findAllWithPagination(
        filters: CourseListFilters,
        options: CourseListOptions,
    ): Promise<CourseListResult> {
        const { page, limit, sort, order } = options;
        const skip = (page - 1) * limit;
        const sortDir = order === 'asc' ? 1 : -1;

        const query: Record<string, unknown> = {};

        // Merge filters from CourseListFilters explicitly to avoid mass assignment
        if (filters.languageId) {
            query.languageId = new mongoose.Types.ObjectId(filters.languageId);
        }
        if (filters.learningGoalId) {
            query.learningGoalId = new mongoose.Types.ObjectId(filters.learningGoalId);
        }
        if (filters.level) {
            query.level = filters.level;
        }
        if (typeof filters.isActive === 'boolean') {
            query.isActive = filters.isActive;
        }
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: 'i' } },
                { slug: { $regex: filters.search, $options: 'i' } },
            ];
        }

        const [courses, total] = await Promise.all([
            this.model
                .find(query)
                .select('-__v -prerequisiteCourseId -finalExamConfig')
                .sort({ [sort]: sortDir })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec() as Promise<ICourse[]>,
            this.model.countDocuments(query),
        ]);

        return {
            courses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    // ── Conflict/Existence checks ──────────────────────────────────────────────

    /**
     * Check if a slug already exists (optionally excluding a courseId for updates).
     */
    async slugExists(slug: string, excludeCourseId?: string): Promise<boolean> {
        const filter: Record<string, unknown> = { slug };
        if (excludeCourseId) {
            filter._id = { $ne: new mongoose.Types.ObjectId(excludeCourseId) };
        }
        const count = await this.model.countDocuments(filter);
        return count > 0;
    }

    /**
     * Check if a course already occupies the compound key
     * (languageId, learningGoalId, level, orderIndex).
     */
    async compoundKeyExists(
        languageId: string,
        learningGoalId: string,
        level: string,
        orderIndex: number,
        excludeCourseId?: string,
    ): Promise<boolean> {
        const filter: Record<string, unknown> = {
            languageId: new mongoose.Types.ObjectId(languageId),
            learningGoalId: new mongoose.Types.ObjectId(learningGoalId),
            level,
            orderIndex,
        };
        if (excludeCourseId) {
            filter._id = { $ne: new mongoose.Types.ObjectId(excludeCourseId) };
        }
        const count = await this.model.countDocuments(filter);
        return count > 0;
    }

    async getNextOrderIndex(languageId: string, learningGoalId: string, level: string): Promise<number> {
        const lastCourse = await this.model
            .findOne({
                languageId: new mongoose.Types.ObjectId(languageId),
                learningGoalId: new mongoose.Types.ObjectId(learningGoalId),
                level,
            })
            .select('orderIndex')
            .sort({ orderIndex: -1 })
            .lean()
            .exec() as { orderIndex?: number } | null;

        return (lastCourse?.orderIndex ?? 0) + 1;
    }

    // ── Single-read helpers ────────────────────────────────────────────────────

    /**
     * Find a single course by its ObjectId with full fields.
     */
    async findByIdFull(courseId: string): Promise<ICourse | null> {
        return this.model
            .findById(courseId)
            .select('-__v -prerequisiteCourseId -finalExamConfig')
            .lean()
            .exec() as Promise<ICourse | null>;
    }

    /**
     * Create a new course from a plain object payload.
     * Maps only allowed fields to prevent mass assignment.
     */
    async createCourse(data: Record<string, unknown>): Promise<ICourse> {
        const doc: Record<string, unknown> = {
            languageId: new mongoose.Types.ObjectId(data.languageId as string),
            learningGoalId: new mongoose.Types.ObjectId(data.learningGoalId as string),
            name: data.name,
            slug: data.slug,
            level: data.level,
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 1,
            totalUnits: 0,
            isActive: true,
        };

        if (data.description !== undefined) {
            doc.description = data.description;
        }
        if (data.thumbnailUrl !== undefined) {
            doc.thumbnailUrl = data.thumbnailUrl;
        }
        return this.model.create(doc);
    }

    /**
     * Update a course by its ObjectId. Returns updated document.
     * Maps only allowed fields to prevent mass assignment.
     */
    async updateCourse(
        courseId: string,
        data: Record<string, unknown>,
    ): Promise<ICourse | null> {
        const update: Record<string, unknown> = {};

        if (typeof data.name === 'string') update.name = data.name;
        if (typeof data.slug === 'string') update.slug = data.slug;
        if (typeof data.level === 'string') update.level = data.level;
        if (typeof data.orderIndex === 'number') update.orderIndex = data.orderIndex;
        if (data.description !== undefined) update.description = data.description;
        if (data.thumbnailUrl !== undefined) update.thumbnailUrl = data.thumbnailUrl;
        if (typeof data.languageId === 'string') {
            update.languageId = new mongoose.Types.ObjectId(data.languageId);
        }
        if (typeof data.learningGoalId === 'string') {
            update.learningGoalId = new mongoose.Types.ObjectId(data.learningGoalId);
        }
        if (typeof data.isActive === 'boolean') update.isActive = data.isActive;

        return this.model
            .findByIdAndUpdate(courseId, update, { new: true, runValidators: true })
            .select('-__v -prerequisiteCourseId -finalExamConfig')
            .lean()
            .exec() as Promise<ICourse | null>;
    }

    /**
     * Delete a course by ObjectId.
     */
    async deleteById(courseId: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(courseId).exec();
        return !!result;
    }

    /**
     * Atomically increment the totalUnits counter.
     */
    async incrementUnitCount(courseId: string): Promise<void> {
        await this.model.findByIdAndUpdate(courseId, { $inc: { totalUnits: 1 } }).exec();
    }

    /**
     * Atomically decrement the totalUnits counter (floor at 0).
     */
    async decrementUnitCount(courseId: string): Promise<void> {
        await this.model
            .findByIdAndUpdate(courseId, { $inc: { totalUnits: -1 } })
            .exec();
    }

    /**
     * Aggregate the full course tree: course → units → lessons.
     * This single query replaces N+1 waterfall calls in the Studio UI.
     */
    async getCourseTree(courseId: string): Promise<ICourse | null> {
        const results = await this.model
            .aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
                {
                    $lookup: {
                        from: 'units',
                        localField: '_id',
                        foreignField: 'courseId',
                        as: 'units',
                        pipeline: [
                            { $sort: { orderIndex: 1 } },
                            {
                                $lookup: {
                                    from: 'lessons',
                                    localField: '_id',
                                    foreignField: 'unitId',
                                    as: 'lessons',
                                    pipeline: [
                                        { $sort: { orderIndex: 1 } },
                                        {
                                            $project: {
                                                _id: 1,
                                                unitId: 1,
                                                title: 1,
                                                type: 1,
                                                orderIndex: 1,
                                                'practiceConfig.mode': 1,
                                                'practiceConfig.passingScore': 1,
                                                createdAt: 1,
                                                updatedAt: 1,
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                $project: {
                                    _id: 1,
                                    courseId: 1,
                                    title: 1,
                                    orderIndex: 1,
                                    description: 1,
                                    thumbnailUrl: 1,
                                    contextSeed: 1,
                                    vectorId: 1,
                                    createdAt: 1,
                                    updatedAt: 1,
                                    lessons: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $project: {
                        __v: 0,
                        prerequisiteCourseId: 0,
                        finalExamConfig: 0,
                    },
                },
            ])
            .exec();

        return results[0] ?? null;
    }
}
