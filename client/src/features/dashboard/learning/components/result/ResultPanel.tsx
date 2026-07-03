import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import type { SubmissionResult } from '../../api/submit-lesson';
import type { LessonQuestionFeedback } from '../../types/learning.types';
import styles from './ResultPanel.module.css';

interface ResultPanelProps {
    courseSlug: string;
    result: SubmissionResult;
    isCompletedLesson: boolean;
    passingScore: number | null;
    onReset: () => void;
    onRestartLesson: () => void;
    isRestartingLesson: boolean;
}

const ResultPanel = ({
    courseSlug,
    result,
    isCompletedLesson,
    passingScore,
    onReset,
    onRestartLesson,
    isRestartingLesson,
}: ResultPanelProps) => {
    const navigate = useNavigate();
    const isAssessed = result.score !== null;
    const isPassed = result.passed;
    const isCourseComplete = result.progress.courseStatus === 'COMPLETED';
    const hasLatestScore = result.latestScore !== null && result.latestScore !== undefined;
    const hasBestScore = result.bestScore !== null && result.bestScore !== undefined;
    const scoresDiffer =
        hasLatestScore && hasBestScore && result.latestScore !== result.bestScore;

    const isReviewMode = result.attemptId === 'restored' && isCompletedLesson;
    const isFailedAttempt = !isPassed && !isCompletedLesson;
    const isPassedAttempt = isPassed && !isReviewMode;

    // Compute correct/total from feedback questions
    const correctCount = useMemo(() => {
        if (!result.feedback?.questions) return null;
        return result.feedback.questions.filter((q) => q.correct).length;
    }, [result.feedback?.questions]);

    const totalCount = useMemo(() => {
        return result.feedback?.questions?.length ?? null;
    }, [result.feedback?.questions]);

    // Focus the result heading on mount
    const headingRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        const timer = setTimeout(() => {
            headingRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────

    const handleRetry = useCallback(() => {
        onReset();
    }, [onReset]);

    const handleRestartLesson = useCallback(() => {
        onRestartLesson();
    }, [onRestartLesson]);

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
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Kết quả bài học">
            <div className={styles.panel}>
                {/* Course-complete congratulations */}
                {isCourseComplete && (
                    <div className={styles.courseComplete}>
                        <div className={styles.bigIcon} aria-hidden="true">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="30" fill="#16a34a" opacity="0.1" />
                                <path d="M20 33l8 8 16-16" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className={styles.bigHeading}>Chúc mừng!</h2>
                        <p className={styles.bigText}>Bạn đã hoàn thành khóa học.</p>
                    </div>
                )}

                {/* Lesson result heading */}
                <div
                    className={`${styles.resultSection} ${isPassed ? styles.passedSection : styles.failedSection}`}
                >
                    <div
                        className={`${styles.statusIcon} ${isPassed ? styles.statusPassed : styles.statusFailed}`}
                        aria-hidden="true"
                    >
                        {isPassed ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        )}
                    </div>

                    <h2
                        className={styles.heading}
                        ref={headingRef}
                        tabIndex={-1}
                    >
                        {isReviewMode && 'Xem lại bài làm'}
                        {isPassedAttempt && 'Hoàn thành'}
                        {isFailedAttempt && 'Chưa đạt'}
                    </h2>

                    {/* Score display — always as percentage */}
                    {isAssessed && (
                        <div className={styles.scoreSection}>
                            <div className={styles.scoreRow}>
                                <span className={styles.scoreValue}>
                                    {result.score}<span className={styles.scorePercent}>%</span>
                                </span>
                            </div>

                            {/* Correct / total count */}
                            {correctCount !== null && totalCount !== null && (
                                <p className={styles.correctCount}>
                                    {correctCount}/{totalCount} câu đúng
                                </p>
                            )}

                            {/* Passing score */}
                            {passingScore !== null && passingScore !== undefined && (
                                <p className={styles.passingInfo}>
                                    Điểm đạt: {passingScore}%
                                </p>
                            )}

                            {/* Latest vs best score comparison */}
                            {scoresDiffer && (
                                <div className={styles.scoreComparison}>
                                    <span className={styles.scoreComparisonItem}>
                                        Lần này: <strong>{result.latestScore}%</strong>
                                    </span>
                                    <span className={styles.scoreComparisonItem}>
                                        Cao nhất: <strong>{result.bestScore}%</strong>
                                    </span>
                                </div>
                            )}

                            {/* Single best score display for review mode */}
                            {isReviewMode && hasBestScore && !scoresDiffer && (
                                <p className={styles.scoreNote}>
                                    Điểm cao nhất: {result.bestScore}%
                                </p>
                            )}
                        </div>
                    )}

                    {/* Summary feedback */}
                    {result.feedback?.summary && (
                        <p className={styles.summary}>{result.feedback.summary}</p>
                    )}

                    {/* Per-question feedback — collapsed by default except wrong answers */}
                    {result.feedback?.questions && result.feedback.questions.length > 0 && (
                        <div className={styles.feedbackList}>
                            <h3 className={styles.feedbackListTitle}>Chi tiết câu hỏi</h3>
                            {result.feedback.questions.map((q) => (
                                <QuestionFeedbackItem key={q.questionId} feedback={q} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    {/* Failed → Retry */}
                    {isFailedAttempt && (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleRetry}
                        >
                            Làm lại
                        </button>
                    )}

                    {/* Passed + has next → Next Lesson */}
                    {isPassedAttempt && result.nextLessonId && (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleNextLesson}
                        >
                            Bài tiếp theo
                        </button>
                    )}

                    {/* Passed + no next → Back to course */}
                    {isPassedAttempt && !result.nextLessonId && (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleBackToCourse}
                        >
                            Về khóa học
                        </button>
                    )}

                    {/* Review mode → explicit retry */}
                    {isReviewMode && (
                        <button
                            type="button"
                            className={styles.retryButton}
                            onClick={handleRestartLesson}
                            disabled={isRestartingLesson}
                        >
                            {isRestartingLesson ? 'Đang xử lý...' : 'Làm lại bài này'}
                        </button>
                    )}

                    {/* Always show back-to-course */}
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
                        Bạn đã hoàn thành tất cả bài học của bài này!
                    </p>
                )}
            </div>
        </div>
    );
};

export default ResultPanel;

// ─── Per-Question Feedback Item ──────────────────────────────────────────────

interface QuestionFeedbackItemProps {
    feedback: LessonQuestionFeedback;
}

const QuestionFeedbackItem = ({ feedback }: QuestionFeedbackItemProps) => {
    const isCorrect = feedback.correct;
    const [isExpanded, setIsExpanded] = useState(isCorrect ? false : true); // wrong answers open by default
    const hasDetail = feedback.explanation !== null && feedback.explanation !== undefined;

    const toggleExpand = useCallback(() => {
        setIsExpanded((v) => !v);
    }, []);

    return (
        <div className={styles.feedbackItem}>
            <button
                type="button"
                className={styles.feedbackItemHeader}
                onClick={toggleExpand}
                aria-expanded={isExpanded}
                aria-label={`Câu hỏi: ${isCorrect ? 'Đúng' : 'Sai'}. Nhấn để ${isExpanded ? 'thu gọn' : 'mở rộng'}`}
            >
                <span
                    className={`${styles.feedbackIcon} ${isCorrect ? styles.feedbackIconCorrect : styles.feedbackIconWrong}`}
                    aria-hidden="true"
                >
                    {isCorrect ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    )}
                </span>
                <span className={styles.feedbackItemLabel}>
                    {isCorrect ? 'Đúng' : 'Sai'}
                </span>
                {hasDetail && (
                    <span className={styles.expandIcon} aria-hidden="true">
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className={styles.feedbackItemDetail}>
                    <div className={styles.feedbackAnswerRow}>
                        <span className={styles.feedbackAnswerLabel}>Câu trả lời của bạn:</span>
                        <span className={`${styles.feedbackAnswer} ${!isCorrect ? styles.feedbackAnswerWrong : ''}`}>
                            {formatAnswer(feedback.learnerAnswer)}
                        </span>
                    </div>

                    {!isCorrect && (
                        <div className={styles.feedbackAnswerRow}>
                            <span className={styles.feedbackAnswerLabel}>Đáp án đúng:</span>
                            <span className={styles.feedbackAnswerCorrect}>
                                {formatAnswer(feedback.correctAnswer)}
                            </span>
                        </div>
                    )}

                    {isExpanded && feedback.explanation && (
                        <p className={styles.feedbackExplanation}>{feedback.explanation}</p>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Format an answer value for display.
 */
function formatAnswer(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'Đúng' : 'Sai';
    if (typeof value === 'object') {
        if (value && 'pairs' in (value as Record<string, unknown>)) {
            const pairs = (value as { pairs: Record<string, string> }).pairs;
            return Object.entries(pairs)
                .map(([k, v]) => `${k} → ${v}`)
                .join(', ');
        }
        return JSON.stringify(value);
    }
    return String(value);
}
