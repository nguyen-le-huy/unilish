import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import type { SubmissionResult } from '../../api/submit-lesson';
import styles from './ResultPanel.module.css';

interface ResultPanelProps {
    courseSlug: string;
    result: SubmissionResult;
    isCompletedLesson: boolean;
    onReset: () => void;
}

const ResultPanel = ({ courseSlug, result, isCompletedLesson, onReset }: ResultPanelProps) => {
    const navigate = useNavigate();
    const isAssessed = result.score !== null;
    const isPassed = result.passed;
    const isCourseComplete = result.progress.courseStatus === 'COMPLETED';

    // Retry handler
    const handleRetry = useCallback(() => {
        onReset();
    }, [onReset]);

    const handleNextLesson = useCallback(() => {
        if (result.nextLessonId) {
            navigate(PATHS.LESSON_PLAYER(result.nextLessonId));
        } else {
            navigate(PATHS.COURSE_DETAIL(courseSlug));
        }
    }, [result.nextLessonId, courseSlug, navigate]);

    const handleBackToCourse = useCallback(() => {
        navigate(PATHS.COURSE_DETAIL(courseSlug));
    }, [courseSlug, navigate]);

    return (
        <div className={styles.overlay}>
            <div className={styles.panel}>
                {/* Course-complete congratulations */}
                {isCourseComplete && (
                    <div className={styles.section}>
                        <div className={styles.bigIcon}>🎉</div>
                        <h2 className={styles.bigHeading}>Chúc mừng!</h2>
                        <p className={styles.bigText}>Bạn đã hoàn thành khóa học.</p>
                    </div>
                )}

                {/* Lesson result */}
                <div className={`${styles.section} ${isPassed ? styles.passedSection : styles.failedSection}`}>
                    <div className={styles.statusIcon}>
                        {isPassed ? '✓' : '✗'}
                    </div>
                    <h2 className={styles.heading}>
                        {isPassed ? 'Hoàn thành' : 'Chưa đạt'}
                    </h2>

                    {isAssessed && (
                        <div className={styles.scoreRow}>
                            <span className={styles.scoreValue}>{result.score}</span>
                            <span className={styles.scoreLabel}>điểm</span>
                        </div>
                    )}

                    {/* Feedback */}
                    {result.feedback !== null && result.feedback !== undefined && (
                        <div className={styles.feedback}>
                            {typeof result.feedback === 'string' ? (
                                <p>{result.feedback}</p>
                            ) : typeof result.feedback === 'object' ? (
                                <pre className={styles.feedbackPre}>
                                    {JSON.stringify(result.feedback, null, 2)}
                                </pre>
                            ) : (
                                <p>{String(result.feedback)}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    {!isPassed && !isCompletedLesson && (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleRetry}
                        >
                            Làm lại
                        </button>
                    )}

                    {isPassed && result.nextLessonId && (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleNextLesson}
                        >
                            Bài tiếp theo
                        </button>
                    )}

                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleBackToCourse}
                    >
                        Về danh sách bài học
                    </button>
                </div>

                {/* Unit-complete notice */}
                {result.progress.unitStatus === 'COMPLETED' && !isCourseComplete && (
                    <p className={styles.unitComplete}>
                        🎉 Bạn đã hoàn thành bài học cuối cùng của bài này!
                    </p>
                )}
            </div>
        </div>
    );
};

export default ResultPanel;
