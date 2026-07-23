import type { IBaseRepository } from './base.repository.interface.js';
import type { IShadowingVideo, IShadowingCue, ShadowingVideoStatus } from '../../models/mongo/shadowing-video.model.js';

export interface IShadowingVideoRepository extends IBaseRepository<IShadowingVideo> {
    findByVideoId(videoId: string): Promise<IShadowingVideo | null>;
    createProcessingVideo(videoId: string, addedBy: string): Promise<IShadowingVideo>;
    markAsProcessing(videoId: string): Promise<void>;
    markAsReady(videoId: string, payload: {
        title: string;
        thumbnailUrl: string;
        durationSeconds: number;
        cues: IShadowingCue[];
    }): Promise<void>;
    updateCues(videoId: string, cues: IShadowingCue[]): Promise<IShadowingVideo | null>;
    deleteByVideoId(videoId: string): Promise<boolean>;
    markAsFailed(videoId: string): Promise<void>;
    listReadyVideos(page: number, limit: number): Promise<IShadowingVideo[]>;
    countReadyVideos(): Promise<number>;
    listAllVideos(page: number, limit: number): Promise<IShadowingVideo[]>;
    countAllVideos(): Promise<number>;
    findVideoStatus(videoId: string): Promise<{ status: ShadowingVideoStatus } | null>;
}
