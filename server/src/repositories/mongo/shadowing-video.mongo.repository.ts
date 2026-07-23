import mongoose from 'mongoose';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { ShadowingVideo, type IShadowingCue, type IShadowingVideo } from '../../models/mongo/shadowing-video.model.js';
import type { IShadowingVideoRepository } from '../../interfaces/repositories/shadowing-video.repository.interface.js';

const fullVideoSelect = 'videoId title thumbnailUrl durationSeconds addedBy cues status createdAt updatedAt';

export class ShadowingVideoMongoRepository
    extends BaseMongoRepository<IShadowingVideo>
    implements IShadowingVideoRepository {
    constructor() {
        super(ShadowingVideo);
    }

    async findByVideoId(videoId: string): Promise<IShadowingVideo | null> {
        return this.model
            .findOne({ videoId })
            .select(fullVideoSelect)
            .lean()
            .exec() as Promise<IShadowingVideo | null>;
    }

    async findVideoStatus(videoId: string): Promise<{ status: IShadowingVideo['status'] } | null> {
        return this.model
            .findOne({ videoId })
            .select('status')
            .lean()
            .exec() as Promise<{ status: IShadowingVideo['status'] } | null>;
    }

    async createProcessingVideo(videoId: string, addedBy: string): Promise<IShadowingVideo> {
        return this.model.create({
            videoId,
            title: `Processing ${videoId}`,
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            durationSeconds: 0,
            addedBy: new mongoose.Types.ObjectId(addedBy),
            cues: [],
            status: 'processing',
        });
    }

    async markAsProcessing(videoId: string): Promise<void> {
        await this.model
            .updateOne(
                { videoId },
                { $set: { status: 'processing' } },
            )
            .exec();
    }

    async markAsReady(
        videoId: string,
        payload: { title: string; thumbnailUrl: string; durationSeconds: number; cues: IShadowingCue[] },
    ): Promise<void> {
        await this.model
            .updateOne(
                { videoId },
                {
                    $set: {
                        title: payload.title,
                        thumbnailUrl: payload.thumbnailUrl,
                        durationSeconds: payload.durationSeconds,
                        cues: payload.cues,
                        status: 'ready',
                    },
                },
            )
            .exec();
    }

    async updateCues(videoId: string, cues: IShadowingCue[]): Promise<IShadowingVideo | null> {
        return this.model
            .findOneAndUpdate(
                { videoId },
                { $set: { cues } },
                { new: true },
            )
            .select(fullVideoSelect)
            .lean()
            .exec() as Promise<IShadowingVideo | null>;
    }

    async deleteByVideoId(videoId: string): Promise<boolean> {
        const result = await this.model.deleteOne({ videoId }).exec();
        return result.deletedCount > 0;
    }

    async markAsFailed(videoId: string): Promise<void> {
        await this.model
            .updateOne({ videoId }, { $set: { status: 'failed' } })
            .exec();
    }

    async listReadyVideos(page: number, limit: number): Promise<IShadowingVideo[]> {
        const skip = (page - 1) * limit;
        return this.model
            .find({ status: 'ready' })
            .select('videoId title thumbnailUrl cues durationSeconds createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec() as Promise<IShadowingVideo[]>;
    }

    async countReadyVideos(): Promise<number> {
        return this.model.countDocuments({ status: 'ready' }).exec();
    }

    async listAllVideos(page: number, limit: number): Promise<IShadowingVideo[]> {
        const skip = (page - 1) * limit;
        return this.model
            .find()
            .select(fullVideoSelect)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec() as Promise<IShadowingVideo[]>;
    }

    async countAllVideos(): Promise<number> {
        return this.model.countDocuments().exec();
    }
}

export const shadowingVideoRepo = new ShadowingVideoMongoRepository();
