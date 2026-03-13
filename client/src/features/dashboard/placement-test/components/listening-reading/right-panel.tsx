import { Button } from '@/components/core/Button';
import styles from './right-panel.module.css';
import type { PartInfo } from './types';

interface Props {
    parts: PartInfo[];
}

export const RightPanel = ({ parts }: Props) => {
    return (
        <div className={styles.right}>
            <div className={styles.timerSection}>
                <p className={styles.timerLabel}>Thời gian còn lại:</p>
                <p className={styles.timerValue}>120:00</p>
            </div>
            <Button size="full">
                Nộp bài
            </Button>
            {parts.map((p) => (
                <div key={p.part} className={styles.partSection}>
                    <p className={styles.partLabel}>{p.label}</p>
                    <div className={styles.questionGrid}>
                        {Array.from({ length: p.questionCount }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                className={styles.questionBox}
                                aria-label={`${p.label} câu ${i + 1}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
