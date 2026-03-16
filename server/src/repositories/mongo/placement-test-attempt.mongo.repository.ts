import mongoose from 'mongoose';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import {
    PlacementTestAttempt,
    EPlacementAttemptStatus,
    type IPlacementTestAttempt,
} from '../../models/mongo/placement-test-attempt.model.js';

export class PlacementTestAttemptMongoRepository extends BaseMongoRepository<IPlacementTestAttempt> {
    constructor() {
        super(PlacementTestAttempt);
    }

    async findInProgressByUserAndTest(userId: string, placementTestId: string): Promise<IPlacementTestAttempt | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                placementTestId: new mongoose.Types.ObjectId(placementTestId),
                status: EPlacementAttemptStatus.IN_PROGRESS,
                expiresAt: { $gt: new Date() },
            })
            .select('userId placementTestId language status startedAt expiresAt submittedAt durationSeconds totalQuestions runtimeSnapshot answerSheet scoring createdAt updatedAt')
            .lean()
            .exec() as Promise<IPlacementTestAttempt | null>;
    }

    async expireInProgressByUserAndTest(userId: string, placementTestId: string): Promise<number> {
        const result = await this.model.updateMany(
            {
                userId: new mongoose.Types.ObjectId(userId),
                placementTestId: new mongoose.Types.ObjectId(placementTestId),
                status: EPlacementAttemptStatus.IN_PROGRESS,
                expiresAt: { $lte: new Date() },
            },
            {
                $set: {
                    status: EPlacementAttemptStatus.EXPIRED,
                },
            },
        ).exec();

        return result.modifiedCount;
    }

    async updateStatus(
        attemptId: string,
        status: typeof EPlacementAttemptStatus[keyof typeof EPlacementAttemptStatus],
    ): Promise<IPlacementTestAttempt | null> {
        return this.model
            .findByIdAndUpdate(
                attemptId,
                { $set: { status } },
                { new: true, runValidators: true },
            )
            .select('userId placementTestId language status startedAt expiresAt submittedAt durationSeconds totalQuestions runtimeSnapshot answerSheet scoring createdAt updatedAt')
            .lean()
            .exec() as Promise<IPlacementTestAttempt | null>;
    }

    async findByIdForUser(attemptId: string, userId: string): Promise<IPlacementTestAttempt | null> {
        return this.model
            .findOne({
                _id: new mongoose.Types.ObjectId(attemptId),
                userId: new mongoose.Types.ObjectId(userId),
            })
            .select('userId placementTestId language status startedAt expiresAt submittedAt durationSeconds totalQuestions runtimeSnapshot answerSheet scoring createdAt updatedAt')
            .lean()
            .exec() as Promise<IPlacementTestAttempt | null>;
    }

    async updateAnswerSheet(attemptId: string, answerSheet: IPlacementTestAttempt['answerSheet']): Promise<IPlacementTestAttempt | null> {
        return this.model
            .findByIdAndUpdate(
                attemptId,
                { $set: { answerSheet } },
                { new: true, runValidators: true },
            )
            .select('userId placementTestId language status startedAt expiresAt submittedAt durationSeconds totalQuestions runtimeSnapshot answerSheet scoring createdAt updatedAt')
            .lean()
            .exec() as Promise<IPlacementTestAttempt | null>;
    }

    async submitAttempt(
        attemptId: string,
        payload: {
            status: typeof EPlacementAttemptStatus[keyof typeof EPlacementAttemptStatus];
            submittedAt: Date;
            durationSeconds: number;
            scoring: NonNullable<IPlacementTestAttempt['scoring']>;
            answerSheet: IPlacementTestAttempt['answerSheet'];
        },
    ): Promise<IPlacementTestAttempt | null> {
        return this.model
            .findByIdAndUpdate(
                attemptId,
                {
                    $set: {
                        status: payload.status,
                        submittedAt: payload.submittedAt,
                        durationSeconds: payload.durationSeconds,
                        scoring: payload.scoring,
                        answerSheet: payload.answerSheet,
                    },
                },
                { new: true, runValidators: true },
            )
            .select('userId placementTestId language status startedAt expiresAt submittedAt durationSeconds totalQuestions runtimeSnapshot answerSheet scoring createdAt updatedAt')
            .lean()
            .exec() as Promise<IPlacementTestAttempt | null>;
    }
}

export const placementTestAttemptMongoRepository = new PlacementTestAttemptMongoRepository();
