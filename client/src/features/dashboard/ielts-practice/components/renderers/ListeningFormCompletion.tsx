/* ──────────────────────────────────────────────────────────────
 * ListeningFormCompletion — Form Completion renderer
 * FR-10: Bind audio/items, answer draft
 * ────────────────────────────────────────────────────────────── */

import { useState, useRef, useCallback, useEffect } from 'react';
import { env } from '@/config/env';
import type { ListeningDetailDto } from '../../types/ielts-practice.types';
import styles from './ListeningFormCompletion.module.css';

interface Props {
  detail: ListeningDetailDto;
  answers: Record<string, string>;
  flaggedIds: string[];
  onAnswerChange: (id: string, value: string) => void;
  onFlagToggle: (id: string) => void;
  disabled?: boolean;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const resolveAudioSource = (url: string, assetId: string): string => {
  const src = (url || assetId || '').trim();
  if (!src) return '';
  if (src.includes('/api/audio/')) return src;

  const apiBase = env.API_URL.replace(/\/+$/, '');

  if (src.startsWith('http')) {
    try {
      const parsed = new URL(src);
      const key = parsed.pathname.replace(/^\/+/, '');
      return key ? `${apiBase}/audio/${key}` : src;
    } catch {
      return src;
    }
  }

  return `${apiBase}/audio/${src.replace(/^\/+/, '').replace(/^api\/audio\//, '')}`;
};

export const ListeningFormCompletion = ({
  detail,
  answers,
  flaggedIds,
  onAnswerChange,
  onFlagToggle,
  disabled = false,
}: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayBlockedRef = useRef(false);
  const { content } = detail;
  const audioSource = resolveAudioSource(content.audio.url, content.audio.assetId);
  const durationSec = audioDuration || content.audio.durationSeconds || 0;

  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled || !audioSource) return;

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          autoplayBlockedRef.current = true;
          setIsPlaying(false);
        });
      }
    } catch {
      autoplayBlockedRef.current = true;
      setIsPlaying(false);
    }
  }, [audioSource, disabled]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      playAudio();
    }
  }, [isPlaying, playAudio]);

  const handleSeek = useCallback((value: number) => {
    const audio = audioRef.current;
    setAudioTime(value);
    if (audio) {
      audio.currentTime = value;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || disabled || !audioSource) return;

    setAudioTime(0);
    setIsPlaying(false);
    autoplayBlockedRef.current = false;
    playAudio();

    const retryTimers = [250, 900, 1800].map((delay) => window.setTimeout(() => {
      if (!audio.paused || disabled) return;
      playAudio();
    }, delay));

    const playAfterUserGesture = () => {
      if (!autoplayBlockedRef.current || disabled) return;
      playAudio();
    };

    window.addEventListener('pointerdown', playAfterUserGesture, { once: true, capture: true });
    window.addEventListener('keydown', playAfterUserGesture, { once: true, capture: true });

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('pointerdown', playAfterUserGesture, { capture: true });
      window.removeEventListener('keydown', playAfterUserGesture, { capture: true });
      audio.pause();
    };
  }, [audioSource, disabled, playAudio]);

  return (
    <div className={styles.container}>
      {/* ── Audio player ─────────────────────────────── */}
      <div className={styles.audioPlayer}>
        <audio
          ref={audioRef}
          src={audioSource}
          preload="auto"
          autoPlay
          playsInline
          onCanPlay={playAudio}
          onLoadedMetadata={(event) => {
            const nextDuration = Math.floor(event.currentTarget.duration || 0);
            setAudioDuration(nextDuration);
            playAudio();
          }}
          onTimeUpdate={(event) => {
            setAudioTime(Math.floor(event.currentTarget.currentTime));
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        <button
          type="button"
          className={styles.playButton}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          disabled={disabled}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8v12.4c0 .9 1 1.4 1.7.9l8.4-6.2a1.1 1.1 0 000-1.8L9.7 4.9C9 4.4 8 4.9 8 5.8z" /></svg>
          )}
        </button>
        <input
          className={styles.progress}
          type="range"
          min={0}
          max={durationSec}
          value={audioTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          aria-label="Tiến độ audio"
          disabled={disabled}
        />
        <span className={styles.time}>
          {formatTime(audioTime)} / {formatTime(durationSec)}
        </span>
      </div>

      {/* ── Instruction ──────────────────────────────── */}
      <p className={styles.instruction}>{content.instruction}</p>

      {/* ── Form completion items ────────────────────── */}
      <section className={styles.completionCard}>
        <div className={styles.heading}>
          <span>{content.heading || 'Form completion'}</span>
        </div>
        <div className={styles.items}>
          {content.items.map((item) => {
            const answer = answers[item.id] ?? '';
            const flagged = flaggedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={styles.item}
                id={`question-${item.id}`}
              >
                <span className={styles.number}>{item.order}</span>
                <p>
                  {item.before}
                  <input
                    value={answer}
                    onChange={(e) => onAnswerChange(item.id, e.target.value)}
                    aria-label={`Đáp án câu ${item.order}`}
                    disabled={disabled}
                    className={styles.input}
                  />
                  {item.after}
                </p>
                <button
                  type="button"
                  className={flagged ? styles.flagActive : styles.flag}
                  onClick={() => onFlagToggle(item.id)}
                  aria-label={`Đánh dấu câu ${item.order}`}
                  disabled={disabled}
                >
                  ⚑
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
