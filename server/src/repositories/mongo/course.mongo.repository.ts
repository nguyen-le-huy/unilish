import { Course, type ICourse } from '../../models/mongo/course.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';

// ─── Filter / Result type definitions ────────────────────────────────────────

export interface CourseListFilters {
    seriesId: string;
    isActive?: boolean;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class CourseMongoRepository extends BaseMongoRepository<ICourse> {
    constructor() {
        super(Course);
    }

    /**
     * Find all courses belonging to a series, ordered by position.
     * MANDATORY: .lean() + .select() on every read path.
     */
    async findBySeriesId(filters: CourseListFilters): Promise<ICourse[]> {
        const query: Record<string, unknown> = { seriesId: filters.seriesId };
        if (typeof filters.isActive === 'boolean') {
            query.isActive = filters.isActive;
        }

        return this.model
            .find(query)
            .select('-__v')
            .sort({ orderInSeries: 1 })
            .lean()
            .exec() as Promise<ICourse[]>;
    }

    /**
     * Find a single course by its ObjectId with full fields.
     */
    async findByIdFull(courseId: string): Promise<ICourse | null> {
        return this.model
            .findById(courseId)
            .select('-__v')
            .lean()
            .exec() as Promise<ICourse | null>;
    }

    /**
     * Create a new course from a plain object payload.
     */
    async createCourse(data: Partial<ICourse>): Promise<ICourse> {
        return this.model.create(data);
    }

    /**
     * Update a course by its ObjectId. Returns updated document.
     */
    async updateById(courseId: string, data: Partial<ICourse>): Promise<ICourse | null> {
        return this.model
            .findByIdAndUpdate(courseId, data, { new: true, runValidators: true })
            .select('-__v')
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
     * Count courses in a series (used for prerequisite / cascade checks).
     */
    async countBySeriesId(seriesId: string): Promise<number> {
        return this.model.countDocuments({ seriesId }).exec();
    }

    /**
     * Aggregate the full course tree: course → units → lessons.
     * This single query replaces N+1 waterfall calls in the Studio UI.
     */
    async getCourseTree(courseId: string): Promise<ICourse | null> {
        const results = await this.model
            .aggregate([
                { $match: { _id: new (await import('mongoose')).default.Types.ObjectId(courseId) } },
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
                    },
                },
            ])
            .exec();

        return results[0] ?? null;
    }
}
