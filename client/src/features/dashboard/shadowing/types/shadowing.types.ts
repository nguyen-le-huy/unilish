export interface Cue {
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
    cues: Cue[];
    status: 'processing' | 'ready' | 'failed';
    createdAt: string;
}

export interface ShadowingVideoSummary {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    cueCount: number;
    durationSeconds: number;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedVideos {
    data: ShadowingVideoSummary[];
    pagination: Pagination;
}

export interface SubmitVideoResponse {
    status: 'processing' | 'ready';
    videoId?: string;
    video?: ShadowingVideo;
}

export interface VideoStatusResponse {
    status: 'processing' | 'ready' | 'failed';
    video?: ShadowingVideo;
}

export interface UpdateCuesPayload {
    cues: Cue[];
    autoTranslate?: boolean;
}

export interface UpdateCuesResponse {
    status: 'ready';
    video: ShadowingVideo;
}

export type PronunciationErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';

export interface PronunciationWordResult {
    word: string;
    accuracyScore: number;
    errorType: PronunciationErrorType;
}

export interface PronunciationResult {
    overallScore: number;
    words: PronunciationWordResult[];
}
