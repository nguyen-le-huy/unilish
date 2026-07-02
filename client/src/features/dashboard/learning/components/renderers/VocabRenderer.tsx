import { useEffect, useRef } from 'react';
import { env } from '@/config/env';
import type { LearnerVocabContent } from './renderer.types';
import styles from './Renderer.module.css';

interface VocabRendererProps {
    content: LearnerVocabContent;
}

const VocabRenderer = ({ content }: VocabRendererProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    const getAudioSources = (rawUrl: string | null | undefined): string[] => {
        const trimmed = rawUrl?.trim();
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
    };

    const playAudio = (rawUrl: string | null | undefined) => {
        const audioSources = getAudioSources(rawUrl);

        audioRef.current?.pause();
        audioRef.current?.removeAttribute('src');
        audioRef.current = null;

        if (audioSources.length === 0) {
            return;
        }

        let sourceIndex = 0;

        const tryPlay = () => {
            if (sourceIndex >= audioSources.length) {
                audioRef.current = null;
                return;
            }

            const audio = new Audio(audioSources[sourceIndex] as string);
            audioRef.current = audio;

            audio.onended = () => {
                audioRef.current = null;
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
    };

    return (
        <div className={styles.renderer}>
            <div className={styles.vocabStack}>
                <div className={styles.itemList}>
                    {content.items.map((item) => {
                        const hasWordAudio = Boolean(item.audioWordUrl);
                        const hasSentenceAudio = Boolean(item.audioSentenceUrl);
                        const showAudioRow = hasWordAudio || hasSentenceAudio;

                        return (
                            <article key={item.id} className={styles.vocabCard}>
                                <div className={styles.vocabMain}>
                                    <div className={styles.vocabCopy}>
                                        <div className={styles.vocabHeader}>
                                            <h3 className={styles.vocabWord}>{item.word}</h3>
                                            <span className={styles.vocabIpa}>{item.ipa}</span>
                                            <span className={styles.vocabPos}>({item.partOfSpeech})</span>
                                        </div>

                                        {showAudioRow && (
                                            <div className={styles.audioRow}>
                                                {hasWordAudio && (
                                                    <button
                                                        type="button"
                                                        className={styles.audioChip}
                                                        onClick={() => playAudio(item.audioWordUrl as string)}
                                                        aria-label={`Phát âm từ ${item.word}`}
                                                        title={`Phát âm từ ${item.word}`}
                                                    >
                                                        <span className={styles.audioIcon} aria-hidden="true">
                                                            <SpeakerIcon />
                                                        </span>
                                                        <span className={styles.audioLabel}>Word</span>
                                                    </button>
                                                )}
                                                {hasSentenceAudio && (
                                                    <button
                                                        type="button"
                                                        className={styles.audioChip}
                                                        onClick={() => playAudio(item.audioSentenceUrl as string)}
                                                        aria-label={`Phát âm câu ví dụ của ${item.word}`}
                                                        title={`Phát âm câu ví dụ của ${item.word}`}
                                                    >
                                                        <span className={styles.audioIcon} aria-hidden="true">
                                                            <SpeakerIcon />
                                                        </span>
                                                        <span className={styles.audioLabel}>Example</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {item.imageUrl && (
                                        <div className={styles.vocabImageWrap}>
                                            <img
                                                src={item.imageUrl}
                                                alt={item.word}
                                                className={styles.vocabImage}
                                                loading="lazy"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={styles.vocabSection}>
                                    <p className={styles.sectionLabel}>Định nghĩa:</p>
                                    <div className={styles.definitionList}>
                                        <p className={styles.definitionNative}>{item.definitionNative}</p>
                                        <p className={styles.definitionEn}>
                                            <span className={styles.definitionPrefix}>=</span>
                                            <span>{item.definitionEn}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className={styles.vocabSection}>
                                    <p className={styles.sectionLabel}>Ví dụ:</p>
                                    <ul className={styles.exampleList}>
                                        <li className={styles.exampleItem}>
                                            <button
                                                type="button"
                                                className={styles.inlineAudioButton}
                                                onClick={() => playAudio(item.audioSentenceUrl ?? item.audioWordUrl ?? '')}
                                                aria-label={`Nghe ví dụ của ${item.word}`}
                                                title={`Nghe ví dụ của ${item.word}`}
                                                disabled={!item.audioSentenceUrl && !item.audioWordUrl}
                                            >
                                                <SpeakerIcon />
                                            </button>
                                            <p className={styles.exampleText}>
                                                <span className={styles.exampleSentence}>{item.exampleSentence}</span>
                                                <span className={styles.exampleTranslation}>
                                                    ({item.exampleTranslation})
                                                </span>
                                            </p>
                                        </li>
                                    </ul>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const SpeakerIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
            d="M11 5 6.5 9H3v6h3.5L11 19V5Z"
            fill="currentColor"
        />
        <path
            d="M15 9.5c.9.9 1.5 2.1 1.5 3.5s-.6 2.6-1.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
        <path
            d="M17.8 6.7C19.2 8.1 20 10 20 12s-.8 3.9-2.2 5.3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
);

export default VocabRenderer;
