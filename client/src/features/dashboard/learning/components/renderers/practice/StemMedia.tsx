import { useEffect, useRef, useState, useCallback } from 'react';
import type { LearnerQuestionStem } from './practice.types';
import { getPlayableAudioSources } from '../audio-url';
import styles from './Practice.module.css';

interface StemMediaProps {
    stem: LearnerQuestionStem;
    /** Whether to render the stem text. Default true. Set false when text is rendered separately (e.g. ErrorCorrection). */
    showText?: boolean;
}

/**
 * Renders the stem text, optional audio player, and optional image
 * for a practice question. Media errors show a fallback but do not
 * prevent the text from being displayed (FR-03).
 */
const StemMedia = ({ stem, showText = true }: StemMediaProps) => {
    return (
        <div className={styles.stemMedia}>
            {showText && stem.text && <p className={styles.stem}>{stem.text}</p>}
            {stem.audioUrl && <StemAudio url={stem.audioUrl} />}
            {stem.imageUrl && <StemImage url={stem.imageUrl} alt={stem.text ?? ''} />}
        </div>
    );
};

// ─── StemAudio ────────────────────────────────────────────────────────────────

interface StemAudioProps {
    url: string;
}

const StemAudio = ({ url }: StemAudioProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleToggle = useCallback(() => {
        const sources = getPlayableAudioSources(url);
        if (sources.length === 0) {
            setHasError(true);
            setIsPlaying(false);
            return;
        }

        if (!audioRef.current) {
            let sourceIndex = 0;

            const tryPlay = () => {
                if (sourceIndex >= sources.length) {
                    audioRef.current = null;
                    setHasError(true);
                    setIsPlaying(false);
                    return;
                }

                const audio = new Audio(sources[sourceIndex] as string);
                audioRef.current = audio;
                audio.onended = () => setIsPlaying(false);
                audio.onerror = () => {
                    sourceIndex += 1;
                    tryPlay();
                };

                void audio.play().then(() => {
                    setHasError(false);
                    setIsPlaying(true);
                }).catch(() => {
                    sourceIndex += 1;
                    tryPlay();
                });
            };

            tryPlay();
            return;
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(() => {
                setHasError(true);
                setIsPlaying(false);
            });
            setHasError(false);
            setIsPlaying(true);
        }
    }, [url, isPlaying]);

    if (hasError) {
        return (
            <p className={styles.mediaError}>
                Không thể phát âm thanh.
            </p>
        );
    }

    return (
        <button
            type="button"
            className={styles.audioButton}
            onClick={handleToggle}
            aria-label={isPlaying ? 'Dừng phát' : 'Phát âm thanh'}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {isPlaying ? (
                    <>
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </>
                ) : (
                    <polygon points="5 3 19 12 5 21 5 3" />
                )}
            </svg>
            <span>{isPlaying ? 'Đang phát...' : 'Nghe'}</span>
        </button>
    );
};

// ─── StemImage ────────────────────────────────────────────────────────────────

interface StemImageProps {
    url: string;
    alt: string;
}

const StemImage = ({ url, alt }: StemImageProps) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className={styles.imageFallback} role="img" aria-label={alt}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={alt || 'Hình ảnh minh họa'}
            className={styles.stemImage}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
};

export default StemMedia;
