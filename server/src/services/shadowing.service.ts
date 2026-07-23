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
import { analyzeCueTextsWithGpt } from './gpt-sentence-splitter.service.js';

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const STALE_PROCESSING_MS = 15 * 60 * 1000;
const PROCESS_VIDEO_TIMEOUT_MS = 3 * 60 * 1000;

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

export interface PaginatedAdminVideosResponse {
    data: IShadowingVideo[];
    pagination: PaginatedVideosResponse['pagination'];
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

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timeoutId: NodeJS.Timeout | null = null;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`${label} timeout after ${timeoutMs}ms`));
                }, timeoutMs);
                timeoutId.unref?.();
            }),
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
};

export class ShadowingService {
    constructor(private readonly shadowingRepo: ShadowingVideoMongoRepository) {}

    private isStaleProcessing(updatedAt?: Date): boolean {
        if (!updatedAt) {
            return true;
        }

        const ageMs = Date.now() - updatedAt.getTime();
        return ageMs >= STALE_PROCESSING_MS;
    }

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
            if (this.isStaleProcessing(existingVideo.updatedAt)) {
                logger.warn('ShadowingService: stale processing detected, re-queueing video', {
                    videoId,
                    updatedAt: existingVideo.updatedAt,
                    staleAfterMs: STALE_PROCESSING_MS,
                });

                await this.shadowingRepo.markAsProcessing(videoId);
                void this.processVideo(videoId);
            }

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

        if (video.status === 'processing' && this.isStaleProcessing(video.updatedAt)) {
            logger.warn('ShadowingService: processing status expired, marking as failed', {
                videoId,
                updatedAt: video.updatedAt,
                staleAfterMs: STALE_PROCESSING_MS,
            });
            await this.shadowingRepo.markAsFailed(videoId);
            return {
                status: 'failed',
            };
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

    async listAdminVideos(page: number = 1, limit: number = 20): Promise<PaginatedAdminVideosResponse> {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(50, Math.max(1, limit));
        const [videos, total] = await Promise.all([
            this.shadowingRepo.listAllVideos(safePage, safeLimit),
            this.shadowingRepo.countAllVideos(),
        ]);

        return {
            data: videos,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
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

    async updateCues(
        videoId: string,
        cues: IShadowingCue[],
        autoTranslate: boolean = false,
    ): Promise<UpdateCuesResponse> {
        const video = await this.shadowingRepo.findByVideoId(videoId);
        if (!video) {
            throw new AppError('Video not found', HttpStatus.NOT_FOUND);
        }

        if (video.status !== 'ready') {
            throw new AppError('Video is not ready for edits', HttpStatus.CONFLICT);
        }

        const existingById = new Map(video.cues.map((cue) => [cue.id, cue] as const));
        const shouldAutoTranslate = Boolean(autoTranslate);
        const cuesNeedingAnalysis = shouldAutoTranslate
            ? cues.filter((cue) => {
                const normalizedText = cue.text.trim();
                if (!normalizedText) {
                    return false;
                }

                const existing = existingById.get(cue.id);
                if (!existing) {
                    return true;
                }

                const textChanged = existing.text.trim() !== normalizedText;
                const missingTranslation = !existing.translationVi?.trim();
                const missingVocabulary = (existing.vocabulary ?? []).length === 0;

                return textChanged || missingTranslation || missingVocabulary;
            })
            : [];

        const analyses = cuesNeedingAnalysis.length > 0
            ? await analyzeCueTextsWithGpt(cuesNeedingAnalysis.map((cue) => cue.text))
            : [];

        const analysesById = new Map<
            string,
            { translationVi: string; vocabulary: IShadowingCue['vocabulary'] }
        >();
        analyses.forEach((analysis, index) => {
            const cueId = cuesNeedingAnalysis[index]?.id;
            if (!cueId) {
                return;
            }

            const normalized = analysis.translationVi.trim();
            if (normalized.length > 0) {
                analysesById.set(cueId, {
                    translationVi: normalized,
                    vocabulary: analysis.vocabulary,
                });
            }
        });

        const nextCues = cues.map((cue) => {
            const normalizedText = cue.text.trim();
            const providedTranslation = cue.translationVi?.trim();
            const providedVocabulary = cue.vocabulary ?? [];

            const analysis = analysesById.get(cue.id);
            if (analysis) {
                return {
                    ...cue,
                    text: normalizedText,
                    translationVi: analysis.translationVi,
                    vocabulary: analysis.vocabulary,
                    commonPhrases: [],
                };
            }

            if (!shouldAutoTranslate && (providedTranslation || providedVocabulary.length > 0)) {
                return {
                    ...cue,
                    text: normalizedText,
                    translationVi: providedTranslation ?? null,
                    vocabulary: providedVocabulary,
                    commonPhrases: [],
                };
            }

            const existing = existingById.get(cue.id);
            if (existing && existing.text.trim() === normalizedText) {
                const fallbackTranslation = providedTranslation ?? existing.translationVi ?? null;
                const fallbackVocabulary = providedVocabulary.length > 0
                    ? providedVocabulary
                    : (existing.vocabulary ?? []);

                return {
                    ...cue,
                    text: normalizedText,
                    translationVi: fallbackTranslation,
                    vocabulary: fallbackVocabulary,
                    commonPhrases: [],
                };
            }

            return {
                ...cue,
                text: normalizedText,
                translationVi: providedTranslation ?? null,
                vocabulary: providedVocabulary,
                commonPhrases: [],
            };
        });

        const updated = await this.shadowingRepo.updateCues(videoId, nextCues);
        if (!updated) {
            throw new AppError('Video not found', HttpStatus.NOT_FOUND);
        }

        return { status: 'ready', video: updated };
    }

    async deleteVideo(videoId: string): Promise<void> {
        const deleted = await this.shadowingRepo.deleteByVideoId(videoId);
        if (!deleted) {
            throw new AppError('Video not found', HttpStatus.NOT_FOUND);
        }
    }

    private async processVideo(videoId: string): Promise<void> {
        try {
            await withTimeout((async () => {
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
            })(), PROCESS_VIDEO_TIMEOUT_MS, `Shadowing video processing (${videoId})`);
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
