import { useEffect, useRef } from 'react';
import styles from './TranscriptPanel.module.css';
import type { ShadowingState } from '../../hooks/use-shadowing-machine';
import type { Cue } from '../../types/shadowing.types';

interface TranscriptPanelProps {
    cues: Cue[];
    activeCueIndex: number;
    mode: 'with-transcript' | 'without-transcript';
    state: ShadowingState;
    onCueClick?: (index: number) => void;
}

const formatTimeRange = (cue: Cue): string => {
    return `${(cue.startMs / 1000).toFixed(1)}s → ${(cue.endMs / 1000).toFixed(1)}s`;
};

const TranscriptPanel = ({
    cues,
    activeCueIndex,
    mode,
    state,
    onCueClick,
}: TranscriptPanelProps) => {
    const cueRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        cueRefs.current[activeCueIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }, [activeCueIndex]);

    return (
        <aside className={styles.panel} aria-label="Transcript panel">
            {cues.map((cue, index) => {
                const isActive = index === activeCueIndex;
                const hideText = mode === 'without-transcript' && state === 'playing';

                return (
                    <div
                        key={cue.id}
                        ref={(element) => {
                            cueRefs.current[index] = element;
                        }}
                        className={`${styles.cueCard} ${isActive ? styles.cueCardActive : ''}`.trim()}
                        role={onCueClick ? 'button' : undefined}
                        tabIndex={onCueClick ? 0 : undefined}
                        onClick={() => onCueClick?.(index)}
                        onKeyDown={(event) => {
                            if (!onCueClick) {
                                return;
                            }

                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onCueClick(index);
                            }
                        }}
                        aria-label={`Cue ${index + 1}: ${formatTimeRange(cue)}`}
                    >
                        <p className={styles.cueIndex}>#cue-{index + 1} · {formatTimeRange(cue)}</p>
                        <p className={`${styles.cueText} ${hideText ? styles.cueTextHidden : ''}`.trim()}>
                            {hideText ? '••••••••••••••••••' : cue.text}
                        </p>
                    </div>
                );
            })}
        </aside>
    );
};

export default TranscriptPanel;
