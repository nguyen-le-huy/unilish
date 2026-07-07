import mongoose from 'mongoose';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import {
    IeltsPracticeAttempt,
    EAttemptStatus,
    type IIeltsPracticeAttempt,
} from '../../models/mongo/ielts-practice-attempt.model.js';

export class IeltsPracticeAttemptMongoRepository extends BaseMongoRepository<IIeltsPracticeAttempt> {
    constructor() {
        super(IeltsPracticeAttempt);
    }

    private readonly fullSelectFields =
        '_id userId examTestId logicalTestId examVersion skill questionType status revision draft flaggedItemIds startedAt deadlineAt lastSavedAt submittedAt result createdAt updatedAt';

    /**
     * Find attempt by id with contentSnapshot excluded by default (select: false).
     */
    async findById(id: string): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findById(id)
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Find attempt with contentSnapshot included (for internal/grading use).
     */
    async findByIdWithSnapshot(id: string): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findById(id)
            .select(this.fullSelectFields + ' +contentSnapshot')
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Find attempt by id and verify ownership.
     */
    async findByIdSecure(attemptId: string, userId: string): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findOne({
                _id: new mongoose.Types.ObjectId(attemptId),
                userId: new mongoose.Types.ObjectId(userId),
            })
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Find an owned attempt with contentSnapshot included for result review.
     */
    async findByIdSecureWithSnapshot(attemptId: string, userId: string): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findOne({
                _id: new mongoose.Types.ObjectId(attemptId),
                userId: new mongoose.Types.ObjectId(userId),
            })
            .select(this.fullSelectFields + ' +contentSnapshot')
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Find an in-progress attempt for a user + logicalTestId.
     */
    async findInProgress(userId: string, logicalTestId: string): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                logicalTestId: new mongoose.Types.ObjectId(logicalTestId),
                status: EAttemptStatus.IN_PROGRESS,
            })
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Batch-find in-progress attempt IDs for a user across multiple examTestIds.
     * Returns a Map<examTestId, attemptId>.
     */
    async findInProgressByExamTestIds(
        userId: string,
        examTestIds: string[],
    ): Promise<Map<string, string>> {
        const objectIds = examTestIds.map((id) => new mongoose.Types.ObjectId(id));
        const results = await this.model
            .find({
                userId: new mongoose.Types.ObjectId(userId),
                examTestId: { $in: objectIds },
                status: EAttemptStatus.IN_PROGRESS,
            })
            .select('_id examTestId')
            .lean()
            .exec() as Array<{ _id: mongoose.Types.ObjectId; examTestId: mongoose.Types.ObjectId }>;

        const map = new Map<string, string>();
        for (const r of results) {
            map.set(String(r.examTestId), String(r._id));
        }
        return map;
    }

    /**
     * Batch-load the learner's recent attempts for the visible test list.
     */
    async findLearnerHistoryByExamTestIds(
        userId: string,
        examTestIds: string[],
    ): Promise<Map<string, IIeltsPracticeAttempt[]>> {
        if (examTestIds.length === 0) return new Map();

        const objectIds = examTestIds.map((id) => new mongoose.Types.ObjectId(id));
        const results = await this.model
            .find({
                userId: new mongoose.Types.ObjectId(userId),
                examTestId: { $in: objectIds },
                status: { $in: [EAttemptStatus.SUBMITTED, EAttemptStatus.EXPIRED] },
            })
            .select('_id examTestId skill questionType status startedAt submittedAt result createdAt updatedAt')
            .sort({ submittedAt: -1, createdAt: -1 })
            .lean()
            .exec() as IIeltsPracticeAttempt[];

        const map = new Map<string, IIeltsPracticeAttempt[]>();
        for (const attempt of results) {
            const key = String(attempt.examTestId);
            const list = map.get(key) ?? [];
            list.push(attempt);
            map.set(key, list);
        }

        return map;
    }

    /**
     * Atomic autosave with revision check. Returns null on conflict.
     */
    async saveDraftIfRevision(
        id: string,
        expectedRevision: number,
        draft: Record<string, unknown>,
        flaggedItemIds: string[],
    ): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(id),
                    revision: expectedRevision,
                    status: EAttemptStatus.IN_PROGRESS,
                },
                {
                    $set: { draft, flaggedItemIds, lastSavedAt: new Date() },
                    $inc: { revision: 1 },
                },
                { new: true, select: this.fullSelectFields },
            )
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Get current revision and draft for conflict response.
     */
    async getCurrentDraft(id: string): Promise<Pick<IIeltsPracticeAttempt, 'revision' | 'draft' | 'lastSavedAt'> | null> {
        return this.model
            .findById(id)
            .select('revision draft lastSavedAt')
            .lean()
            .exec() as Promise<Pick<IIeltsPracticeAttempt, 'revision' | 'draft' | 'lastSavedAt'> | null>;
    }

    /**
     * Create a new attempt.
     */
    async createAttempt(data: {
        userId: string;
        examTestId: string;
        logicalTestId?: string;
        examVersion: number;
        skill: string;
        questionType: string;
        contentSnapshot: Record<string, unknown>;
        draft: Record<string, unknown>;
        startedAt: Date;
        deadlineAt: Date;
    }): Promise<IIeltsPracticeAttempt> {
        const [result] = await this.model.create([
            {
                userId: new mongoose.Types.ObjectId(data.userId),
                examTestId: new mongoose.Types.ObjectId(data.examTestId),
                ...(data.logicalTestId
                    ? { logicalTestId: new mongoose.Types.ObjectId(data.logicalTestId) }
                    : {}),
                examVersion: data.examVersion,
                skill: data.skill,
                questionType: data.questionType,
                status: EAttemptStatus.IN_PROGRESS,
                revision: 0,
                contentSnapshot: data.contentSnapshot,
                draft: data.draft,
                flaggedItemIds: [],
                startedAt: data.startedAt,
                deadlineAt: data.deadlineAt,
            },
        ]);

        return result as unknown as IIeltsPracticeAttempt;
    }

    /**
     * Submit attempt — status → submitted, set submittedAt, optionally set result.
     * Only transitions from in_progress and checks deadline expiry.
     */
    async submitAttempt(
        id: string,
        now: Date,
        deadlineAt: Date,
        expectedRevision: number,
        result?: IIeltsPracticeAttempt['result'],
    ): Promise<IIeltsPracticeAttempt | null> {
        const isExpired = now > deadlineAt;
        const targetStatus = isExpired ? EAttemptStatus.EXPIRED : EAttemptStatus.SUBMITTED;

        const update: Record<string, unknown> = {
            status: targetStatus,
            submittedAt: now,
        };

        if (result) {
            update.result = result;
        }

        return this.model
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(id),
                    status: EAttemptStatus.IN_PROGRESS,
                    revision: expectedRevision,
                },
                { $set: update },
                { new: true, select: this.fullSelectFields },
            )
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Abandon attempt — only from in_progress.
     */
    async abandonAttempt(id: string): Promise<IIeltsPracticeAttempt | null> {
        return this.model
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(id),
                    status: EAttemptStatus.IN_PROGRESS,
                },
                { $set: { status: EAttemptStatus.ABANDONED } },
                { new: true, select: this.fullSelectFields },
            )
            .lean()
            .exec() as Promise<IIeltsPracticeAttempt | null>;
    }

    /**
     * Expire any in_progress attempts past their deadline.
     */
    async expireOverdue(now: Date): Promise<number> {
        const result = await this.model
            .updateMany(
                {
                    status: EAttemptStatus.IN_PROGRESS,
                    deadlineAt: { $lt: now },
                },
                { $set: { status: EAttemptStatus.EXPIRED } },
            )
            .exec();

        return result.modifiedCount;
    }

    /**
     * Count attempts for a given examTestId for attemptCount display.
     */
    async countByExamTestId(examTestId: string): Promise<number> {
        return this.model
            .countDocuments({ examTestId: new mongoose.Types.ObjectId(examTestId) })
            .exec();
    }

    /**
     * Batch count attempts for multiple examTestIds.
     * Returns array of { examTestId, count }.
     */
    async countByExamTestIds(examTestIds: string[]): Promise<Array<{ examTestId: string; count: number }>> {
        const objectIds = examTestIds.map((id) => new mongoose.Types.ObjectId(id));
        const results = await this.model
            .aggregate([
                { $match: { examTestId: { $in: objectIds } } },
                { $group: { _id: '$examTestId', count: { $sum: 1 } } },
            ])
            .exec();

        return results.map((r) => ({
            examTestId: String(r._id),
            count: r.count,
        }));
    }

    /**
     * Count completed attempts (submitted/expired) for analytics.
     */
    async countCompletedByExamTestId(examTestId: string): Promise<number> {
        return this.model
            .countDocuments({
                examTestId: new mongoose.Types.ObjectId(examTestId),
                status: { $in: [EAttemptStatus.SUBMITTED, EAttemptStatus.EXPIRED] },
            })
            .exec();
    }

    /**
     * Get aggregate analytics for a given examTestId.
     */
    async getAggregateAnalytics(examTestId: string): Promise<{
        totalAttempts: number;
        completedAttempts: number;
        averageDurationSeconds: number;
        averageNormalizedScore: number;
    }> {
        const objectId = new mongoose.Types.ObjectId(examTestId);

        const [totalAttempts, completedAttempts, durationResult, scoreResult] = await Promise.all([
            this.model.countDocuments({ examTestId: objectId }).exec(),
            this.model.countDocuments({
                examTestId: objectId,
                status: { $in: [EAttemptStatus.SUBMITTED, EAttemptStatus.EXPIRED] },
            }).exec(),
            this.model.aggregate([
                { $match: { examTestId: objectId, submittedAt: { $ne: null } } },
                {
                    $project: {
                        durationSeconds: {
                            $divide: [
                                { $subtract: ['$submittedAt', '$startedAt'] },
                                1000,
                            ],
                        },
                    },
                },
                { $group: { _id: null, avgDuration: { $avg: '$durationSeconds' } } },
            ]).exec(),
            this.model.aggregate([
                { $match: { examTestId: objectId, 'result.normalizedScore': { $exists: true } } },
                { $group: { _id: null, avgScore: { $avg: '$result.normalizedScore' } } },
            ]).exec(),
        ]);

        return {
            totalAttempts,
            completedAttempts,
            averageDurationSeconds: Math.round(durationResult[0]?.avgDuration ?? 0),
            averageNormalizedScore: scoreResult[0]?.avgScore ?? 0,
        };
    }
}

export const ieltsPracticeAttemptMongoRepository = new IeltsPracticeAttemptMongoRepository();
