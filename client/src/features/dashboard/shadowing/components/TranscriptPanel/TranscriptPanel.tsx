import { useEffect, useRef } from 'react';
import styles from './TranscriptPanel.module.css';
import type { Cue } from '../../types/shadowing.types';

interface TranscriptPanelProps {
    cues: Cue[];
    activeCueIndex: number;
    mode: 'with-transcript' | 'without-transcript';
    onCueClick?: (index: number) => void;
}

const formatTimeRange = (cue: Cue): string => {
    return `${(cue.startMs / 1000).toFixed(1)}s → ${(cue.endMs / 1000).toFixed(1)}s`;
};

const maskTranscriptText = (text: string): string => text.replace(/\S/g, '*');

const TranscriptPanel = ({ cues, activeCueIndex, mode, onCueClick }: TranscriptPanelProps) => {
    const cueRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        cueRefs.current[activeCueIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeCueIndex]);

    return (
        <aside className={styles.panel} aria-label="Transcript bài luyện">
            <header className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                    <strong>Transcript</strong>
                    <span>{cues.length} câu hội thoại</span>
                </div>
            </header>

            {cues.map((cue, index) => {
                const isActive = index === activeCueIndex;
                const hideText = mode === 'without-transcript';
                const translation = cue.translationVi?.trim();
                const vocabulary = cue.vocabulary ?? [];

                return (
                    <div
                        key={cue.id}
                        ref={(element) => { cueRefs.current[index] = element; }}
                        className={`${styles.cueCard} ${isActive ? styles.cueCardActive : ''}`.trim()}
                        role={onCueClick ? 'button' : undefined}
                        tabIndex={onCueClick ? 0 : undefined}
                        onClick={() => onCueClick?.(index)}
                        onKeyDown={(event) => {
                            if (onCueClick && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault();
                                onCueClick(index);
                            }
                        }}
                        aria-label={`Câu ${index + 1}: ${formatTimeRange(cue)}`}
                    >
                        <div className={styles.cueHeader}>
                            <span className={styles.cueIndex}>
                                Câu {String(index + 1).padStart(2, '0')} · {formatTimeRange(cue)}
                            </span>
                        </div>
                        <div className={styles.cueTextBlock}>
                            <p className={`${styles.cueText} ${hideText ? styles.cueTextHidden : ''}`.trim()}>
                                {hideText ? maskTranscriptText(cue.text) : cue.text}
                            </p>
                            {!hideText && translation && <p className={styles.cueTranslation}>{translation}</p>}
                            {!hideText && vocabulary.length > 0 && (
                                <div className={styles.cueExtras}>
                                    <div className={styles.cueSection}>
                                        <p className={styles.cueSectionTitle}>Từ vựng</p>
                                        <ul className={styles.cueList}>
                                            {vocabulary.map((item) => (
                                                <li key={`${cue.id}-${item.word}-${item.ipa}`} className={styles.cueListItem}>
                                                    <span className={styles.cueWord}>{item.word}</span>
                                                    <span className={styles.cueMetaInline}> /{item.ipa}/ · {item.pos}</span>
                                                    <span className={styles.cueTranslationInline}> — {item.translationVi}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </aside>
    );
};

export default TranscriptPanel;
