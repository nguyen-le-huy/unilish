export { default as ShadowingPage } from './pages/ShadowingPage/ShadowingPage';
export { default as ShadowingPlayerPage } from './pages/ShadowingPlayerPage/ShadowingPlayerPage';
export { shadowingService } from './api/shadowing.service';
export { useVideoLibrary } from './hooks/use-video-library';
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
    VideoStatusResponse,
} from './types/shadowing.types';
