import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Cue } from '../types/shadowing.types';

interface YouTubePlayerInstance {
    loadVideoById: (videoId: string, startSeconds?: number) => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    getCurrentTime: () => number;
    destroy: () => void;
}

interface YouTubePlayerConstructor {
    new (elementId: string, options: {
        videoId?: string;
        playerVars?: Record<string, number | string>;
        events?: {
            onReady?: () => void;
        };
    }): YouTubePlayerInstance;
}

interface YouTubeApi {
    Player: YouTubePlayerConstructor;
}

declare global {
    interface Window {
        YT?: YouTubeApi;
        onYouTubeIframeAPIReady?: () => void;
    }
}

interface UseYtPlayerReturn {
    playerRef: MutableRefObject<YouTubePlayerInstance | null>;
    isReady: boolean;
    playCue: (cue: Cue) => void;
    replayCue: (cue: Cue) => void;
    pausePlayer: () => void;
}

const YT_IFRAME_SCRIPT_ID = 'unilish-youtube-iframe-api';
const CUE_POLLING_MS = 100;

let ytApiPromise: Promise<YouTubeApi> | null = null;

const loadYouTubeIframeApi = (): Promise<YouTubeApi> => {
    if (window.YT?.Player) {
        return Promise.resolve(window.YT);
    }

    if (ytApiPromise) {
        return ytApiPromise;
    }

    ytApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
        const script = document.getElementById(YT_IFRAME_SCRIPT_ID) as HTMLScriptElement | null;

        const handleReady = () => {
            if (window.YT?.Player) {
                resolve(window.YT);
                return;
            }
            reject(new Error('YouTube IFrame API loaded but player is unavailable.'));
        };

        window.onYouTubeIframeAPIReady = handleReady;

        if (script) {
            script.addEventListener('error', () => reject(new Error('Unable to load YouTube IFrame API.')));
            return;
        }

        const tag = document.createElement('script');
        tag.id = YT_IFRAME_SCRIPT_ID;
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => reject(new Error('Unable to load YouTube IFrame API.'));

        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag?.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            return;
        }

        document.head.appendChild(tag);
    });

    return ytApiPromise;
};

export const useYtPlayer = (
    containerId: string,
    videoId: string,
    onCueEnd: () => void,
): UseYtPlayerReturn => {
    const playerRef = useRef<YouTubePlayerInstance | null>(null);
    const cuePollingRef = useRef<number | null>(null);

    const [isReady, setIsReady] = useState(false);

    const clearCuePolling = useCallback(() => {
        if (cuePollingRef.current !== null) {
            window.clearInterval(cuePollingRef.current);
            cuePollingRef.current = null;
        }
    }, []);

    const pausePlayer = useCallback(() => {
        const player = playerRef.current;
        if (player) {
            player.pauseVideo();
            clearCuePolling();
        }
    }, [clearCuePolling]);

    const playCue = useCallback((cue: Cue): void => {
        const player = playerRef.current;

        if (!player) {
            return;
        }

        const cueStartSeconds = cue.startMs / 1000;
        const cueEndSeconds = cue.endMs / 1000;

        clearCuePolling();
        player.seekTo(cueStartSeconds, true);
        player.playVideo();

        cuePollingRef.current = window.setInterval(() => {
            const currentTime = player.getCurrentTime();
            if (currentTime >= cueEndSeconds) {
                clearCuePolling();
                player.pauseVideo();
                onCueEnd();
            }
        }, CUE_POLLING_MS);
    }, [clearCuePolling, onCueEnd]);

    const replayCue = useCallback((cue: Cue) => {
        clearCuePolling();
        playCue(cue);
    }, [clearCuePolling, playCue]);

    useEffect(() => {
        let isCancelled = false;

        const initPlayer = async () => {
            const api = await loadYouTubeIframeApi();
            const mountElement = document.getElementById(containerId);

            if (isCancelled || !mountElement) {
                return;
            }

            playerRef.current = new api.Player(containerId, {
                videoId,
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => {
                        if (isCancelled) {
                            return;
                        }

                        setIsReady(true);
                    },
                },
            });
        };

        void initPlayer();

        return () => {
            isCancelled = true;
            clearCuePolling();
            setIsReady(false);
            playerRef.current?.destroy();
            playerRef.current = null;
        };
    }, [clearCuePolling, containerId, videoId]);

    useEffect(() => {
        if (!isReady || !playerRef.current) {
            return;
        }

        playerRef.current.loadVideoById(videoId, 0);
        clearCuePolling();
    }, [clearCuePolling, isReady, videoId]);

    return useMemo(() => ({
        playerRef,
        isReady,
        playCue,
        replayCue,
        pausePlayer,
    }), [isReady, pausePlayer, playCue, replayCue]);
};
