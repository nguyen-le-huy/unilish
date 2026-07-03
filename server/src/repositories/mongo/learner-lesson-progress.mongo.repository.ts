import { LearnerLessonProgress, type ILearnerLessonProgress, ELessonProgressStatus } from '../../models/mongo/learner-lesson-progress.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import mongoose from 'mongoose';

export class LearnerLessonProgressMongoRepository extends BaseMongoRepository<ILearnerLessonProgress> {
    constructor() {
        super(LearnerLessonProgress);
    }

    /**
     * Find progress for a specific (user, lesson) — unique pair.
     */
    async findByUserAndLesson(userId: string, lessonId: string): Promise<ILearnerLessonProgress | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                lessonId: new mongoose.Types.ObjectId(lessonId),
            })
            .lean()
            .exec() as Promise<ILearnerLessonProgress | null>;
    }

    /**
     * Find all progress records for an enrollment.
     */
    async findByEnrollment(enrollmentId: string): Promise<ILearnerLessonProgress[]> {
        return this.model
            .find({ enrollmentId: new mongoose.Types.ObjectId(enrollmentId) })
            .lean()
            .exec() as Promise<ILearnerLessonProgress[]>;
    }

    /**
     * Find all progress records for a user's enrollment, keyed by lesson type status.
     */
    async findCompletedByEnrollment(enrollmentId: string): Promise<ILearnerLessonProgress[]> {
        return this.model
            .find({
                enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
                status: ELessonProgressStatus.COMPLETED,
            })
            .lean()
            .exec() as Promise<ILearnerLessonProgress[]>;
    }

    /**
     * Get the most recently accessed lesson for a user.
     */
    async findMostRecentByUser(userId: string): Promise<ILearnerLessonProgress | null> {
        return this.model
            .findOne({ userId: new mongoose.Types.ObjectId(userId) })
            .sort({ lastAccessedAt: -1 })
            .lean()
            .exec() as Promise<ILearnerLessonProgress | null>;
    }

    /**
     * Atomically increment the checkpoint version and set new checkpoint data.
     * Used for optimistic concurrency control.
     */
    async updateCheckpoint(
        progressId: string,
        userId: string,
        expectedVersion: number,
        checkpoint: unknown,
        timeDeltaSeconds: number,
    ): Promise<ILearnerLessonProgress | null> {
        const doc = await this.model
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(progressId),
                    userId: new mongoose.Types.ObjectId(userId),
                    checkpointVersion: expectedVersion,
                    status: { $ne: ELessonProgressStatus.COMPLETED },
                },
                {
                    $inc: { checkpointVersion: 1, timeSpentSeconds: timeDeltaSeconds },
                    $set: {
                        checkpoint,
                        lastAccessedAt: new Date(),
                        status: ELessonProgressStatus.IN_PROGRESS,
                    },
                },
                { new: true },
            )
            .lean()
            .exec();

        return doc as unknown as ILearnerLessonProgress | null;
    }

    /**
     * Atomically save the latest checkpoint without requiring the caller to
     * already know the current version. Intended for learner autosave where
     * the latest local edit should win over an older in-flight request.
     */
    async updateCheckpointLatest(
        progressId: string,
        userId: string,
        checkpoint: unknown,
        timeDeltaSeconds: number,
    ): Promise<ILearnerLessonProgress | null> {
        const doc = await this.model
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(progressId),
                    userId: new mongoose.Types.ObjectId(userId),
                    status: { $ne: ELessonProgressStatus.COMPLETED },
                },
                {
                    $inc: { checkpointVersion: 1, timeSpentSeconds: timeDeltaSeconds },
                    $set: {
                        checkpoint,
                        lastAccessedAt: new Date(),
                        status: ELessonProgressStatus.IN_PROGRESS,
                    },
                },
                { new: true },
            )
            .lean()
            .exec();

        return doc as unknown as ILearnerLessonProgress | null;
    }

    /**
     * Mark a lesson as COMPLETED with score.
     */
    async completeLesson(
        progressId: string,
        userId: string,
        score: number,
        passed: boolean,
    ): Promise<ILearnerLessonProgress | null> {
        const now = new Date();
        const update: Record<string, unknown> = {
            status: ELessonProgressStatus.COMPLETED,
            latestScore: score,
            completedAt: now,
            lastAccessedAt: now,
        };

        // Only update bestScore if this is higher
        const current = await this.model
            .findById(progressId)
            .select('bestScore')
            .lean()
            .exec() as { bestScore: number } | null;

        if (current) {
            if (score > current.bestScore) {
                update.bestScore = score;
            }
            // Always increment attempts count
            update.$inc = { attemptsCount: 1 };
        }

        const doc = await this.model
            .findByIdAndUpdate(progressId, update, { new: true })
            .lean()
            .exec();

        return doc as unknown as ILearnerLessonProgress | null;
    }
}
