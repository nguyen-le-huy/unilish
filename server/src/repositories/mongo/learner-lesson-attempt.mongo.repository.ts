import { LearnerLessonAttempt, type ILearnerLessonAttempt } from '../../models/mongo/learner-lesson-attempt.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import mongoose from 'mongoose';

export class LearnerLessonAttemptMongoRepository extends BaseMongoRepository<ILearnerLessonAttempt> {
    constructor() {
        super(LearnerLessonAttempt);
    }

    /**
     * Find an attempt by idempotency key (clientAttemptId).
     */
    async findByClientAttemptId(userId: string, clientAttemptId: string): Promise<ILearnerLessonAttempt | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                clientAttemptId,
            })
            .lean()
            .exec() as Promise<ILearnerLessonAttempt | null>;
    }

    /**
     * Find all attempts for a (user, lesson), sorted by recency.
     */
    async findByUserAndLesson(userId: string, lessonId: string): Promise<ILearnerLessonAttempt[]> {
        return this.model
            .find({
                userId: new mongoose.Types.ObjectId(userId),
                lessonId: new mongoose.Types.ObjectId(lessonId),
            })
            .sort({ submittedAt: -1 })
            .lean()
            .exec() as Promise<ILearnerLessonAttempt[]>;
    }

    /**
     * Create an immutable attempt record.
     */
    async createAttempt(data: {
        clientAttemptId: string;
        userId: string;
        enrollmentId: string;
        lessonId: string;
        submittedAnswers: unknown;
        score: number;
        passed: boolean;
        feedback: unknown;
        durationSeconds: number;
    }): Promise<ILearnerLessonAttempt> {
        return this.model.create({
            clientAttemptId: data.clientAttemptId,
            userId: new mongoose.Types.ObjectId(data.userId),
            enrollmentId: new mongoose.Types.ObjectId(data.enrollmentId),
            lessonId: new mongoose.Types.ObjectId(data.lessonId),
            submittedAnswers: data.submittedAnswers as any,
            score: data.score,
            passed: data.passed,
            feedback: data.feedback as any,
            durationSeconds: data.durationSeconds,
            submittedAt: new Date(),
        } as any);
    }
}
