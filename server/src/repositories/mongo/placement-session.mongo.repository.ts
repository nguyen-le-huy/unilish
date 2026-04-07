import mongoose from 'mongoose';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { PlacementSession, type IPlacementSession } from '../../models/mongo/placement-session.model.js';

const placementSessionSelect = 'userId placementTestId lrAttemptId lrRawScore lrScoring status currentModule writing speaking createdAt updatedAt';

export class PlacementSessionMongoRepository extends BaseMongoRepository<IPlacementSession> {
    constructor() {
        super(PlacementSession);
    }

    async findByIdForUser(sessionId: string, userId: string): Promise<IPlacementSession | null> {
        return this.model
            .findOne({
                _id: new mongoose.Types.ObjectId(sessionId),
                userId: new mongoose.Types.ObjectId(userId),
            })
            .select(placementSessionSelect)
            .lean()
            .exec() as Promise<IPlacementSession | null>;
    }

    async findById(sessionId: string): Promise<IPlacementSession | null> {
        return this.model
            .findById(new mongoose.Types.ObjectId(sessionId))
            .select(placementSessionSelect)
            .lean()
            .exec() as Promise<IPlacementSession | null>;
    }

    async findByLrAttemptId(userId: string, lrAttemptId: string): Promise<IPlacementSession | null> {
        return this.model
            .findOne({
                userId: new mongoose.Types.ObjectId(userId),
                lrAttemptId: new mongoose.Types.ObjectId(lrAttemptId),
            })
            .select(placementSessionSelect)
            .lean()
            .exec() as Promise<IPlacementSession | null>;
    }

    async updateById(sessionId: string, data: Partial<IPlacementSession>): Promise<IPlacementSession | null> {
        return this.model
            .findByIdAndUpdate(sessionId, { $set: data }, { new: true, runValidators: true })
            .select(placementSessionSelect)
            .lean()
            .exec() as Promise<IPlacementSession | null>;
    }

    async patchById(sessionId: string, update: Record<string, unknown>): Promise<IPlacementSession | null> {
        return this.model
            .findByIdAndUpdate(sessionId, update, { new: true, runValidators: true })
            .select(placementSessionSelect)
            .lean()
            .exec() as Promise<IPlacementSession | null>;
    }
}

export const placementSessionMongoRepository = new PlacementSessionMongoRepository();
