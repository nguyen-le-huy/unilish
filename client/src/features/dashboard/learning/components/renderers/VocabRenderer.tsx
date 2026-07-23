import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { LearnerVocabContent } from './renderer.types';
import { getPlayableAudioSources } from './audio-url';
import { VocabPronunciationPractice } from './VocabPronunciationPractice';
import styles from './Renderer.module.css';

interface VocabRendererProps {
    content: LearnerVocabContent;
}

const VocabRenderer = ({ content }: VocabRendererProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    const playAudio = (rawUrl: string | null | undefined) => {
        const audioSources = getPlayableAudioSources(rawUrl);

        audioRef.current?.pause();
        audioRef.current?.removeAttribute('src');
        audioRef.current = null;

        if (audioSources.length === 0) return;

        let sourceIndex = 0;
        const tryPlay = () => {
            if (sourceIndex >= audioSources.length) {
                audioRef.current = null;
                return;
            }

            const audio = new Audio(audioSources[sourceIndex] as string);
            audioRef.current = audio;
            audio.onended = () => { audioRef.current = null; };
            audio.onerror = () => { sourceIndex += 1; tryPlay(); };
            void audio.play().catch(() => { sourceIndex += 1; tryPlay(); });
        };
        tryPlay();
    };

    if (content.items.length === 0) {
        return <div className={styles.vocabEmpty}>Bài học chưa có từ vựng.</div>;
    }

    const total = content.items.length;
    const safeIndex = Math.min(currentIndex, total - 1);
    const item = content.items[safeIndex]!;
    const progress = Math.round(((safeIndex + 1) / total) * 100);

    const toggleCard = (event: MouseEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest('button')) return;
        setIsFlipped((value) => !value);
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if ((event.target as HTMLElement).closest('button')) return;
        event.preventDefault();
        setIsFlipped((value) => !value);
    };

    const showPrevious = () => {
        setCurrentIndex((index) => Math.max(index - 1, 0));
        setIsFlipped(false);
    };

    const showNext = () => {
        setCurrentIndex((index) => Math.min(index + 1, total - 1));
        setIsFlipped(false);
    };

    const resetDeck = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    return (
        <div className={`${styles.renderer} ${styles.flashcardRenderer}`}>
            <div className={styles.flashcardProgressRow}>
                <button
                    type="button"
                    className={styles.flashcardBackButton}
                    onClick={showPrevious}
                    disabled={safeIndex === 0}
                    aria-label="Quay lại thẻ trước"
                >
                    <ArrowLeftIcon />
                </button>
                <div className={styles.flashcardProgressTrack} aria-label={`Tiến độ ${progress}%`}>
                    <span style={{ width: `${progress}%` }} />
                </div>
                <strong className={styles.flashcardProgressPercent}>{progress}%</strong>
            </div>

            <p className={styles.flashcardCounter}>Flashcard {safeIndex + 1} / {total}</p>

            <article
                key={item.id}
                className={styles.flashcard}
                onClick={toggleCard}
                onKeyDown={handleCardKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`${isFlipped ? 'Mặt sau' : 'Mặt trước'} flashcard ${item.word}. Nhấn để lật thẻ.`}
            >
                <div className={`${styles.flashcardInner} ${isFlipped ? styles.flashcardFlipped : ''}`}>
                    <div
                        className={`${styles.flashcardFace} ${styles.flashcardFront}`}
                        aria-hidden={isFlipped}
                        inert={isFlipped ? true : undefined}
                    >
                        <span className={styles.flashcardSideBadge}>LẬT THẺ</span>
                        <h3 className={styles.flashcardWord}>{item.word}</h3>
                        <div className={styles.flashcardPronunciation}>
                            <span>{item.ipa}</span>
                            <button
                                type="button"
                                className={styles.flashcardAudioButton}
                                onClick={() => playAudio(item.audioWordUrl)}
                                disabled={!item.audioWordUrl}
                                aria-label={`Phát âm từ ${item.word}`}
                            >
                                <SpeakerIcon />
                            </button>
                        </div>
                        <div className={styles.flashcardFrontPractice}>
                            <VocabPronunciationPractice word={item.word} />
                        </div>
                        <p className={styles.flashcardHint}>Chạm vào thẻ để xem nghĩa và ví dụ</p>
                    </div>

                    <div
                        className={`${styles.flashcardFace} ${styles.flashcardBack}`}
                        aria-hidden={!isFlipped}
                        inert={!isFlipped ? true : undefined}
                    >
                        <span className={styles.flashcardSideBadge}>MẶT SAU</span>
                        <div className={styles.flashcardBackHeader}>
                            <div>
                                <h3>{item.word}</h3>
                                <p>{item.ipa} <span>({item.partOfSpeech})</span></p>
                            </div>
                            {item.imageUrl && <img src={item.imageUrl} alt={item.word} loading="lazy" />}
                        </div>

                        <section className={styles.flashcardDefinition}>
                            <span>Định nghĩa</span>
                            <strong>{item.definitionNative}</strong>
                            <p>{item.definitionEn}</p>
                        </section>

                        <section className={styles.flashcardExample}>
                            <span>Ví dụ</span>
                            <div>
                                <button
                                    type="button"
                                    className={styles.inlineAudioButton}
                                    onClick={() => playAudio(item.audioSentenceUrl ?? item.audioWordUrl)}
                                    disabled={!item.audioSentenceUrl && !item.audioWordUrl}
                                    aria-label={`Nghe ví dụ của ${item.word}`}
                                >
                                    <SpeakerIcon />
                                </button>
                                <p><strong>{item.exampleSentence}</strong><small>{item.exampleTranslation}</small></p>
                            </div>
                        </section>

                        <VocabPronunciationPractice word={item.word} />
                    </div>
                </div>
            </article>

            <div className={styles.flashcardNavigation}>
                <button type="button" onClick={showPrevious} disabled={safeIndex === 0}>Thẻ trước</button>
                <button type="button" onClick={showNext} disabled={safeIndex === total - 1}>
                    {safeIndex === total - 1 ? 'Đã hoàn thành' : 'Thẻ tiếp theo'}
                </button>
            </div>

            <button type="button" className={styles.flashcardReset} onClick={resetDeck}>
                <ResetIcon /> Làm lại bài này
            </button>
        </div>
    );
};

const SpeakerIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" />
        <path d="M15 9.5c.9.9 1.5 2.1 1.5 3.5s-.6 2.6-1.5 3.5M17.8 6.7C19.2 8.1 20 10 20 12s-.8 3.9-2.2 5.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ResetIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default VocabRenderer;
