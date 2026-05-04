import styles from './TranscriptSidebar.module.css';
import type { Cue } from '../../types/shadowing.types';

interface Props {
    cues: Cue[];
    activeCueIndex: number;
}

const TranscriptSidebar = ({ cues, activeCueIndex }: Props) => {
    const progress = cues.length > 0
        ? Math.round(((activeCueIndex + 1) / cues.length) * 100)
        : 0;

    return (
        <div className={styles.sidebarContainer}>
            <div className={styles.sidebarHeader}>
                <div className={styles.tabs}>
                    <span className={styles.tabActive}>BẢN CHÉP</span>
                    <span className={styles.tabInactive}>🎯 Cue {activeCueIndex + 1}</span>
                </div>
                <div className={styles.progress}>{progress}%</div>
            </div>

            <div className={styles.cueList}>
                {cues.map((cue, index) => (
                    <article
                        key={cue.id}
                        className={`${styles.cueCard} ${index === activeCueIndex ? styles.cueCardActive : ''}`}
                    >
                        <div className={styles.cueCardHeader}>
                            <span className={styles.cueNumber}>#{cue.id}</span>
                            <div className={styles.cueActions}>
                                <span>{(cue.startMs / 1000).toFixed(1)}s</span>
                                <span>{(cue.endMs / 1000).toFixed(1)}s</span>
                            </div>
                        </div>
                        <div className={styles.cueText}>{cue.text}</div>
                    </article>
                ))}
            </div>
        </div>
    );
};

export default TranscriptSidebar;
