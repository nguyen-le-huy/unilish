import styles from './CueDisplay.module.css';
import type { ShadowingState } from '../../hooks/use-shadowing-machine';
import type { Cue } from '../../types/shadowing.types';

interface CueDisplayProps {
    cue: Cue;
    mode: 'with-transcript' | 'without-transcript';
    state: ShadowingState;
}

const formatCueTime = (milliseconds: number): string => {
    return `${(milliseconds / 1000).toFixed(1)}s`;
};

const CueDisplay = ({ cue, mode, state }: CueDisplayProps) => {
    const shouldHideText = mode === 'without-transcript' && state === 'playing';

    return (
        <section className={styles.cueContainer} aria-label="Current cue">
            <p className={styles.cueMeta}>
                #{cue.id} · {formatCueTime(cue.startMs)} → {formatCueTime(cue.endMs)}
            </p>
            <p className={`${styles.cueText} ${shouldHideText ? styles.cueTextHidden : ''}`.trim()}>
                {shouldHideText ? '••••••••••••••••••' : cue.text}
            </p>
            {cue.text.length > 200 && (
                <p className={styles.cueWarning} role="note">
                    ⚠ This segment is long — take it slowly.
                </p>
            )}
        </section>
    );
};

export default CueDisplay;
