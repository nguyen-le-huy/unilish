import { useEffect, useRef } from 'react';
import styles from './ReadyScreen.module.css';

interface ReadyScreenProps {
    /** Total number of questions. */
    totalQuestions: number;
    /** Passing score percentage (0-100). */
    passingScore: number | null;
    /** Number of checkpoint answers restored (for resume). */
    restoredCount: number;
    /** Number of stale/incompatible checkpoint answers. */
    staleCount: number;
    /** Called when the learner clicks start or continue. */
    onStart: () => void;
}

/**
 * READY phase screen showing question count, passing score,
 * and a CTA to start or continue the exercise.
 *
 * Design spec §4.1:
 * - Shows 8 câu hỏi, Điểm đạt: 80%, [Bắt đầu làm bài]
 * - If checkpoint: Đã làm 3/8 câu, [Tiếp tục làm bài]
 */
const ReadyScreen = ({
    totalQuestions,
    passingScore,
    restoredCount,
    staleCount,
    onStart,
}: ReadyScreenProps) => {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const hasCheckpoint = restoredCount > 0;
    const ctaLabel = hasCheckpoint ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài';

    return (
        <div className={styles.readyScreen} role="region" aria-label="Sẵn sàng làm bài">
            <div className={styles.card}>
                <div className={styles.iconWrapper} aria-hidden="true">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        fill="none"
                        aria-hidden="true"
                    >
                        <rect width="48" height="48" rx="24" fill="#292524" opacity="0.08" />
                        <path
                            d="M16 24l6 6 10-10"
                            stroke="#292524"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <h2 className={styles.heading} ref={headingRef} tabIndex={-1}>
                    Luyện tập
                </h2>

                <p className={styles.info}>
                    <span className={styles.infoNumber}>{totalQuestions}</span> câu hỏi
                </p>

                {passingScore !== null && passingScore !== undefined && (
                    <p className={styles.info}>
                        Điểm đạt: <span className={styles.infoNumber}>{passingScore}%</span>
                    </p>
                )}

                {hasCheckpoint && (
                    <p className={styles.checkpointInfo}>
                        Đã làm {restoredCount}/{totalQuestions} câu
                    </p>
                )}

                {staleCount > 0 && (
                    <p className={styles.staleInfo}>
                        {staleCount} câu trả lời trước không còn tương thích và đã được bỏ qua.
                    </p>
                )}

                <button
                    type="button"
                    className={styles.startButton}
                    onClick={onStart}
                    aria-label={ctaLabel}
                >
                    {ctaLabel}
                </button>
            </div>
        </div>
    );
};

export default ReadyScreen;
