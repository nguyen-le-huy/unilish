export interface ShadowingCue {
    id: string;
    text: string;
    translationVi?: string | null;
    vocabulary?: Array<{
        word: string;
        pos: string;
        translationVi: string;
        ipa: string;
    }>;
    commonPhrases?: Array<{
        phrase: string;
        translationVi: string;
    }>;
    startMs: number;
    endMs: number;
}

export interface ShadowingVideo {
    _id: string;
    videoId: string;
    title: string;
    thumbnailUrl: string;
    durationSeconds: number;
    cues: ShadowingCue[];
    status: 'processing' | 'ready' | 'failed';
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedShadowingVideos {
    data: ShadowingVideo[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface SubmitShadowingVideoResponse {
    status: 'processing' | 'ready';
    videoId?: string;
    video?: ShadowingVideo;
}

export interface UpdateShadowingCuesResponse {
    status: 'ready';
    video: ShadowingVideo;
}
