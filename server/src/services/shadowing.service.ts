import axios from 'axios';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { DeepgramService } from './deepgram.service.js';
import { YtDlpService } from './yt-dlp.service.js';
import {
    shadowingVideoRepo,
    type ShadowingVideoMongoRepository,
} from '../repositories/mongo/shadowing-video.mongo.repository.js';
import type { IShadowingCue, IShadowingVideo, ShadowingVideoStatus } from '../models/mongo/shadowing-video.model.js';
import { AzurePronunciationService, type PronunciationResult } from './azure-pronunciation.service.js';

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

interface SubmitVideoReadyResponse {
    status: 'ready';
    video: IShadowingVideo;
}

interface SubmitVideoProcessingResponse {
    status: 'processing';
    videoId: string;
}

export type SubmitVideoResponse = SubmitVideoReadyResponse | SubmitVideoProcessingResponse;

export type VideoStatusResponse = {
    status: ShadowingVideoStatus;
    video?: IShadowingVideo;
};

export type UpdateCuesResponse = {
    status: 'ready';
    video: IShadowingVideo;
};

export interface VideoLibraryItem {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    cueCount: number;
    durationSeconds: number;
    createdAt: Date;
}

export interface PaginatedVideosResponse {
    data: VideoLibraryItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface OEmbedResponse {
    title: string;
    thumbnail_url: string;
}

const parseYoutubeVideoId = (rawUrl: string): string | null => {
    try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname.toLowerCase();

        if (host.includes('youtu.be')) {
            const candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
            return YOUTUBE_VIDEO_ID_REGEX.test(candidate) ? candidate : null;
        }

        if (host.includes('youtube.com')) {
            const watchId = parsed.searchParams.get('v');
            if (watchId && YOUTUBE_VIDEO_ID_REGEX.test(watchId)) {
                return watchId;
            }

            const parts = parsed.pathname.split('/').filter(Boolean);
            const directCandidate = parts[1] ?? '';
            if ((parts[0] === 'shorts' || parts[0] === 'embed') && YOUTUBE_VIDEO_ID_REGEX.test(directCandidate)) {
                return directCandidate;
            }
        }

        return null;
    } catch {
        return null;
    }
};

export class ShadowingService {
    constructor(private readonly shadowingRepo: ShadowingVideoMongoRepository) {}

    async submitVideo(url: string, userId: string): Promise<SubmitVideoResponse> {
        const videoId = parseYoutubeVideoId(url);

        if (!videoId) {
            throw new AppError('Invalid YouTube URL', HttpStatus.BAD_REQUEST);
        }

        const existingVideo = await this.shadowingRepo.findByVideoId(videoId);

        if (existingVideo?.status === 'ready') {
            return {
                status: 'ready',
                video: existingVideo,
            };
        }

        if (existingVideo?.status === 'processing') {
            return {
                status: 'processing',
                videoId,
            };
        }

        if (existingVideo?.status === 'failed') {
            await this.shadowingRepo.markAsProcessing(videoId);
        } else {
            await this.shadowingRepo.createProcessingVideo(videoId, userId);
        }

        void this.processVideo(videoId);

        return {
            status: 'processing',
            videoId,
        };
    }

    async getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
        const video = await this.shadowingRepo.findByVideoId(videoId);
        if (!video) {
            throw new AppError('Video not found', HttpStatus.NOT_FOUND);
        }

        if (video.status === 'ready') {
            return {
                status: 'ready',
                video,
            };
        }

        return {
            status: video.status,
        };
    }

    async listVideos(page: number = 1, limit: number = 12): Promise<PaginatedVideosResponse> {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(50, Math.max(1, limit));

        const [videos, total] = await Promise.all([
            this.shadowingRepo.listReadyVideos(safePage, safeLimit),
            this.shadowingRepo.countReadyVideos(),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
        const data = videos.map((video) => ({
            videoId: video.videoId,
            title: video.title,
            thumbnailUrl: video.thumbnailUrl,
            cueCount: video.cues.length,
            durationSeconds: video.durationSeconds,
            createdAt: video.createdAt,
        }));

        return {
            data,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages,
            },
        };
    }

    async scorePronunciation(audioBuffer: Buffer, referenceText: string, audioMimeType?: string): Promise<PronunciationResult> {
        const normalizedReferenceText = referenceText.trim();
        if (!normalizedReferenceText) {
            throw new AppError('referenceText is required', HttpStatus.BAD_REQUEST);
        }

        return AzurePronunciationService.scoreAudioBuffer(audioBuffer, normalizedReferenceText, audioMimeType);
    }

    async updateCues(videoId: string, userId: string, cues: IShadowingCue[]): Promise<UpdateCuesResponse> {
        const video = await this.shadowingRepo.findByVideoId(videoId);
        if (!video) {
            throw new AppError('Video not found', HttpStatus.NOT_FOUND);
        }

        if (video.status !== 'ready') {
            throw new AppError('Video is not ready for edits', HttpStatus.CONFLICT);
        }

        if (String(video.addedBy) !== userId) {
            throw new AppError('Forbidden', HttpStatus.FORBIDDEN);
        }

        const updated = await this.shadowingRepo.updateCues(videoId, userId, cues);
        if (!updated) {
            throw new AppError('Video not found', HttpStatus.NOT_FOUND);
        }

        return { status: 'ready', video: updated };
    }

    private async processVideo(videoId: string): Promise<void> {
        try {
            const audioPath = await YtDlpService.extractAudio(videoId);
            const cues = await DeepgramService.transcribe(audioPath);
            const metadata = await this.fetchOEmbed(videoId);
            const durationSeconds = cues.length > 0
                ? Math.ceil(cues[cues.length - 1]!.endMs / 1000)
                : 0;

            await this.shadowingRepo.markAsReady(videoId, {
                title: metadata.title,
                thumbnailUrl: metadata.thumbnail_url,
                durationSeconds,
                cues,
            });
        } catch (error) {
            logger.error('Shadowing processing pipeline failed', { videoId, error });
            await this.shadowingRepo.markAsFailed(videoId);
        }
    }

    private async fetchOEmbed(videoId: string): Promise<OEmbedResponse> {
        try {
            const response = await axios.get<OEmbedResponse>('https://www.youtube.com/oembed', {
                params: {
                    url: `https://youtube.com/watch?v=${videoId}`,
                    format: 'json',
                },
                timeout: 8_000,
            });

            return response.data;
        } catch {
            throw new AppError('Could not fetch YouTube metadata', HttpStatus.BAD_GATEWAY);
        }
    }
}

export const shadowingService = new ShadowingService(shadowingVideoRepo);
