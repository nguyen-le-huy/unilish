import { Button } from '@/components/core/Button';
import styles from './right-panel.module.css';
import type { PartInfo, PartQuestionStatus, ToeicPart } from './types';

interface Props {
    parts: PartInfo[];
    timeRemainingLabel: string;
    questionStatuses: Partial<Record<ToeicPart, PartQuestionStatus[]>>;
    activePart: ToeicPart;
    onSubmit: () => void;
    isSubmitPending?: boolean;
}

export const RightPanel = ({
    parts,
    timeRemainingLabel,
    questionStatuses,
    activePart,
    onSubmit,
    isSubmitPending = false,
}: Props) => {
    return (
        <div className={styles.right}>
            <div className={styles.timerSection}>
                <p className={styles.timerLabel}>Thời gian còn lại:</p>
                <p className={styles.timerValue}>{timeRemainingLabel}</p>
            </div>
            <Button size="full" onClick={onSubmit} disabled={isSubmitPending}>
                Nộp bài
            </Button>
            {parts.map((p) => (
                <div key={p.part} className={styles.partSection}>
                    <p className={styles.partLabel}>{p.label}</p>
                    <div className={styles.questionGrid}>
                        {(questionStatuses[p.part] ?? Array.from({ length: p.questionCount }, (_, i) => ({
                            questionId: `${p.part}-${i + 1}`,
                            number: i + 1,
                            state: 'unanswered' as const,
                        }))).map((item) => {
                            const classes = [styles.questionBox];

                            if (item.state === 'answered') {
                                classes.push(styles.questionBoxAnswered);
                            }

                            if (item.state === 'flagged') {
                                classes.push(styles.questionBoxFlagged);
                            }

                            if (activePart === p.part) {
                                classes.push(styles.questionBoxActive);
                            }

                            return (
                                // Native button is intentional for dynamic multi-state class composition.
                                <button
                                    key={item.questionId}
                                    type="button"
                                    className={classes.join(' ')}
                                    aria-label={`${p.label} câu ${item.number}`}
                                >
                                    {item.number}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
