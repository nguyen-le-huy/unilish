import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './audio-player.module.css';

interface Props {
    src?: string;
    autoPlayOnChange?: boolean;
    playTrigger?: string | number;
}

const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({ src, autoPlayOnChange = false, playTrigger }: Props) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showVolume, setShowVolume] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !src || audioError) return;

        if (isPlaying) {
            audio.pause();
        } else {
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    setAudioError('Không thể phát audio cho phần này.');
                    setIsPlaying(false);
                });
            }
        }
    }, [audioError, isPlaying, src]);

    const handleTimeUpdate = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || isDragging) return;
        setCurrentTime(audio.currentTime);
    }, [isDragging]);

    const handleLoadedMetadata = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        setAudioError(null);
    }, []);

    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    const handlePlay = useCallback(() => {
        setIsPlaying(true);
    }, []);

    const handlePause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const handleAudioError = useCallback(() => {
        setAudioError('Không thể tải audio cho phần này.');
        setIsPlaying(false);
    }, []);

    const getProgressPercent = (clientX: number): number => {
        const bar = progressRef.current;
        if (!bar) return 0;
        const rect = bar.getBoundingClientRect();
        const ratio = (clientX - rect.left) / rect.width;
        return Math.min(Math.max(ratio, 0), 1);
    };

    const seek = useCallback((clientX: number) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const ratio = getProgressPercent(clientX);
        const newTime = ratio * duration;
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    const handleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        seek(e.clientX);
    };

    useEffect(() => {
        setAudioError(null);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
    }, [src]);

    useEffect(() => {
        if (!autoPlayOnChange || !src || audioError) {
            return;
        }

        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        const playAudio = () => {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    setIsPlaying(false);
                });
            }
        };

        if (audio.readyState >= 2) {
            playAudio();
            return;
        }

        audio.addEventListener('canplay', playAudio, { once: true });
        audio.load();

        return () => {
            audio.removeEventListener('canplay', playAudio);
        };
    }, [audioError, autoPlayOnChange, playTrigger, src]);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => seek(e.clientX);
        const handleMouseUp = (e: MouseEvent) => {
            seek(e.clientX);
            setIsDragging(false);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, seek]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (audioRef.current) audioRef.current.volume = val;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isDisabled = !src || Boolean(audioError);

    return (
        <div className={styles.player}>
            {src && (
                <audio
                    ref={audioRef}
                    src={src}
                    preload="auto"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onError={handleAudioError}
                />
            )}

            {/* Play / Pause */}
            <button
                type="button"
                className={styles.playBtn}
                onClick={togglePlay}
                disabled={isDisabled}
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? (
                    <PauseIcon />
                ) : (
                    <PlayIcon />
                )}
            </button>

            {/* Time */}
            <span className={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>

            {/* Progress bar */}
            <div
                ref={progressRef}
                className={styles.progressTrack}
                onMouseDown={isDisabled ? undefined : handleBarMouseDown}
                role="slider"
                aria-label="Seek"
                aria-valuenow={Math.round(currentTime)}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                tabIndex={isDisabled ? -1 : 0}
            >
                <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                />
                <div
                    className={styles.progressThumb}
                    style={{ left: `${progressPercent}%` }}
                />
            </div>

            {/* Volume */}
            <div className={styles.volumeWrapper}>
                <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Volume"
                    onClick={() => setShowVolume((v) => !v)}
                >
                    {volume === 0 ? <MuteIcon /> : <VolumeIcon />}
                </button>
                {showVolume && (
                    <div className={styles.volumePopup}>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolumeChange}
                            className={styles.volumeSlider}
                            aria-label="Volume level"
                        />
                    </div>
                )}
            </div>

            {/* Options */}
            <button type="button" className={styles.iconBtn} aria-label="Options">
                <DotsIcon />
            </button>

            {audioError && (
                <span className={styles.time} aria-live="polite">
                    {audioError}
                </span>
            )}
        </div>
    );
};

/* ── SVG icons ── */

const PlayIcon = () => (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
        <path d="M1 1l10 6L1 13V1z" />
    </svg>
);

const PauseIcon = () => (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
        <rect x="1" y="1" width="3.5" height="12" rx="1" />
        <rect x="7.5" y="1" width="3.5" height="12" rx="1" />
    </svg>
);

const VolumeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const MuteIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
);

const DotsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);
