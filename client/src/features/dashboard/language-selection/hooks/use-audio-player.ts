import { useCallback, useEffect, useRef, useState } from 'react';
import { env } from '@/config/env';
import type { LanguageOption } from '../types/language';

interface UseAudioPlayerReturn {
    playingCode: string | null;
    playGreeting: (language: LanguageOption) => void;
    stopAudio: () => void;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
    const [playingCode, setPlayingCode] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const getAudioSources = useCallback((greetingSound?: string | null): string[] => {
        const trimmed = greetingSound?.trim();
        if (!trimmed) {
            return [];
        }

        const sources: string[] = [];
        const pushUnique = (value: string) => {
            if (!sources.includes(value)) {
                sources.push(value);
            }
        };

        const normalizedApiBase = env.API_URL.replace(/\/+$/, '');
        const appBase = normalizedApiBase.replace(/\/api$/, '');

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            try {
                const parsed = new URL(trimmed);
                const key = parsed.pathname.replace(/^\/+/, '');
                const isR2PublicHost =
                    parsed.hostname.endsWith('r2.dev')
                    || parsed.hostname.includes('r2.cloudflarestorage.com');

                if (key) {
                    pushUnique(`${normalizedApiBase}/audio/${key}`);
                }

                if (!isR2PublicHost) {
                    pushUnique(trimmed);
                }
            } catch {
                pushUnique(trimmed);
            }

            return sources;
        }

        if (trimmed.startsWith('/')) {
            const noLeadingSlash = trimmed.replace(/^\/+/, '');

            if (noLeadingSlash.startsWith('api/audio/')) {
                pushUnique(`${appBase}/${noLeadingSlash}`);
            } else if (noLeadingSlash.startsWith('audio/')) {
                pushUnique(`${normalizedApiBase}/${noLeadingSlash}`);
            } else {
                pushUnique(`${normalizedApiBase}/audio/${noLeadingSlash}`);
            }

            return sources;
        }

        const key = trimmed.replace(/^\/+/, '');
        pushUnique(`${normalizedApiBase}/audio/${key}`);
        pushUnique(`${appBase}/${key}`);

        return sources;
    }, []); // env.API_URL is a module-level constant and is immutable at runtime.

    const stopAudio = useCallback(() => {
        if (!audioRef.current) {
            return;
        }

        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
        setPlayingCode(null);
    }, []);

    const playGreeting = useCallback((language: LanguageOption) => {
        const audioSources = getAudioSources(language.greetingSound);

        stopAudio();

        if (audioSources.length === 0) {
            return;
        }

        let sourceIndex = 0;

        const tryPlay = () => {
            if (sourceIndex >= audioSources.length) {
                setPlayingCode(null);
                audioRef.current = null;
                return;
            }

            const audio = new Audio(audioSources[sourceIndex] as string);
            audioRef.current = audio;

            audio.onplay = () => setPlayingCode(language.code);
            audio.onended = () => {
                setPlayingCode((prev) => (prev === language.code ? null : prev));
                audioRef.current = null;
            };
            audio.onpause = () => {
                setPlayingCode((prev) => (prev === language.code ? null : prev));
            };
            audio.onerror = () => {
                sourceIndex += 1;
                tryPlay();
            };

            void audio.play().catch(() => {
                sourceIndex += 1;
                tryPlay();
            });
        };

        tryPlay();
    }, [getAudioSources, stopAudio]);

    useEffect(() => {
        return () => {
            stopAudio();
        };
    }, [stopAudio]);

    return {
        playingCode,
        playGreeting,
        stopAudio,
    };
};
