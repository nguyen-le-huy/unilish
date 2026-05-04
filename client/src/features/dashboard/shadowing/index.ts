export { default as ShadowingPage } from './pages/ShadowingPage/ShadowingPage';
export { default as ShadowingPlayerPage } from './pages/ShadowingPlayerPage/ShadowingPlayerPage';
export { shadowingService } from './api/shadowing.service';
export { useSubmitVideo } from './hooks/use-submit-video';
export { useVideoLibrary } from './hooks/use-video-library';
export { useVideoStatus } from './hooks/use-video-status';
export { useYtPlayer } from './hooks/use-yt-player';
export { useShadowingMachine } from './hooks/use-shadowing-machine';
export { useShadowingRecorder } from './hooks/use-shadowing-recorder';
export { useAzurePronunciation } from './hooks/use-azure-pronunciation';
export type { ShadowingState } from './hooks/use-shadowing-machine';
export type {
    Cue,
    PaginatedVideos,
    PronunciationResult,
    PronunciationWordResult,
    ShadowingVideo,
    ShadowingVideoSummary,
    SubmitVideoResponse,
    VideoStatusResponse,
} from './types/shadowing.types';
