import { CourseEnrollment, type ICourseEnrollment, EEnrollmentStatus } from '../../models/mongo/course-enrollment.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import mongoose from 'mongoose';

export interface EnrollmentFilter {
    userId: string;
    status?: string | undefined;
}

export class CourseEnrollmentMongoRepository extends BaseMongoRepository<ICourseEnrollment> {
    constructor() {
        super(CourseEnrollment);
    }

    /**
     * Find enrollment by user + course (unique pair).
     */
    async findByUserAndCourse(userId: string, courseId: string): Promise<ICourseEnrollment | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                courseId: new mongoose.Types.ObjectId(courseId),
            })
            .lean()
            .exec() as Promise<ICourseEnrollment | null>;
    }

    /**
     * Find the current ACTIVE enrollment for a user.
     */
    async findActiveByUser(userId: string): Promise<ICourseEnrollment | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                status: EEnrollmentStatus.ACTIVE,
            })
            .sort({ updatedAt: -1 })
            .lean()
            .exec() as Promise<ICourseEnrollment | null>;
    }

    /**
     * List enrollments for a user, optionally filtered by status.
     */
    async findByUser(userId: string, filter?: EnrollmentFilter): Promise<ICourseEnrollment[]> {
        const query: Record<string, unknown> = {
            userId: new mongoose.Types.ObjectId(userId),
        };
        if (filter?.status) {
            query.status = filter.status;
        }

        return this.model
            .find(query)
            .sort({ updatedAt: -1 })
            .lean()
            .exec() as Promise<ICourseEnrollment[]>;
    }

    /**
     * Atomically pause all ACTIVE enrollments for a user.
     * Used when activating a new enrollment.
     */
    async pauseAllActiveByUser(userId: string): Promise<number> {
        const result = await this.model
            .updateMany(
                {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: EEnrollmentStatus.ACTIVE,
                },
                {
                    $set: { status: EEnrollmentStatus.PAUSED },
                },
            )
            .exec();

        return result.modifiedCount;
    }

    /**
     * Atomically set an enrollment as ACTIVE and pause all others.
     * Returns the updated enrollment, or null if not found.
     */
    async activateEnrollment(enrollmentId: string, userId: string): Promise<ICourseEnrollment | null> {
        // Pause all active enrollments for this user
        await this.pauseAllActiveByUser(userId);

        // Activate the target enrollment
        return this.model
            .findByIdAndUpdate(
                enrollmentId,
                {
                    $set: {
                        status: EEnrollmentStatus.ACTIVE,
                        startedAt: new Date(),
                        completedAt: null,
                    },
                },
                { new: true },
            )
            .lean()
            .exec() as Promise<ICourseEnrollment | null>;
    }

    /**
     * Create or reactivate an enrollment idempotently.
     * Returns { enrollment, created }.
     */
    async upsertEnrollment(
        userId: string,
        courseId: string,
        totalRequiredLessons: number,
    ): Promise<{ enrollment: ICourseEnrollment; created: boolean }> {
        // Check for existing enrollment
        const existing = await this.findByUserAndCourse(userId, courseId);

        if (existing) {
            return { enrollment: existing, created: false };
        }

        const enrollment = await this.model.create({
            userId: new mongoose.Types.ObjectId(userId),
            courseId: new mongoose.Types.ObjectId(courseId),
            status: EEnrollmentStatus.ACTIVE,
            totalRequiredLessonCount: totalRequiredLessons,
            startedAt: new Date(),
        });

        return { enrollment, created: true };
    }

    /**
     * Get enrollment by ID (for authorization checks).
     */
    async findByIdSecure(enrollmentId: string, userId: string): Promise<ICourseEnrollment | null> {
        return this.model
            .findOne({
                _id: new mongoose.Types.ObjectId(enrollmentId),
                userId: new mongoose.Types.ObjectId(userId),
            })
            .lean()
            .exec() as Promise<ICourseEnrollment | null>;
    }
}
