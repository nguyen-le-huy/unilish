import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLesson, useStartLesson, useSubmitLesson } from '../../hooks/use-lesson';
import { useCourseRoadmap } from '../../hooks/use-course-roadmap';
import LessonRenderer from '../../components/renderers/LessonRenderer';
import ResultPanel from '../../components/result/ResultPanel';
import type { SubmissionResult } from '../../api/submit-lesson';
import { PATHS } from '@/config/paths';
import styles from './LessonPlayerPage.module.css';

const AUTOSAVE_INTERVAL_MS = 20000;

const LessonPlayerPage = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    // Lesson data
    const { data: lessonData, isLoading, isError, refetch } = useLesson(lessonId);
    const { mutate: startLesson } = useStartLesson();
    const submitMutation = useSubmitLesson();
    const startedLessonIdRef = useRef<string | null>(null);

    // Course slug for roadmap + breadcrumb
    const courseSlug = lessonData?.course.slug;
    const { data: roadmapData } = useCourseRoadmap(courseSlug);

    // Navigation state
    const [showRoadmap, setShowRoadmap] = useState(false);
    const prevLessonId = lessonData?.navigation.previousLessonId ?? null;
    const nextLessonId = lessonData?.navigation.nextLessonId ?? null;
    const isAssessed = lessonData?.lesson.passingScore !== null;
    const isCompletedLesson = lessonData?.progress.status === 'COMPLETED';

    // Autosave
    const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'conflict'>('saved');
    const checkpointRef = useRef<Record<string, unknown>>({});
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    // Submission state
    const [submissionState, setSubmissionState] = useState<{
        lessonId: string;
        result: SubmissionResult;
    } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const clientAttemptIdRef = useRef<string>('');

    // Route guard — unsaved changes
    const hasUnsavedRef = useRef(false);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (hasUnsavedRef.current) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // Start/resume lesson on load
    useEffect(() => {
        if (!lessonId || isLoading || !lessonData || startedLessonIdRef.current === lessonId) {
            return;
        }

        startedLessonIdRef.current = lessonId;
        startLesson(lessonId);
        startTimeRef.current = Date.now();
    }, [lessonId, isLoading, lessonData, startLesson]);

    // Restore checkpoint
    useEffect(() => {
        if (lessonData?.progress.checkpoint) {
            checkpointRef.current = lessonData.progress.checkpoint as Record<string, unknown>;
        }
    }, [lessonData?.progress.checkpoint]);

    const restoredSubmissionResult = useMemo<SubmissionResult | null>(() => {
        if (lessonData?.progress.status !== 'COMPLETED' || lessonData.progress.bestScore === null) {
            return null;
        }

        return {
            attemptId: 'restored',
            score: lessonData.progress.bestScore,
            passed: true,
            feedback: null,
            progress: {
                lessonStatus: 'COMPLETED',
                unitStatus: 'COMPLETED',
                courseStatus: 'ACTIVE',
                courseProgressPercent: 0,
            },
            nextLessonId: lessonData.navigation.nextLessonId,
        };
    }, [lessonData]);

    const currentSubmissionResult = submissionState && submissionState.lessonId === lessonId
        ? submissionState.result
        : null;
    const displayedSubmissionResult = currentSubmissionResult ?? restoredSubmissionResult;

    // Periodic autosave
    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (hasUnsavedRef.current) {
                setAutosaveStatus('saving');
                setAutosaveStatus('saved');
                hasUnsavedRef.current = false;
            }
        }, AUTOSAVE_INTERVAL_MS);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── Submission handlers ──────────────────────────────────────────────────

    const handleSubmit = useCallback(() => {
        if (!lessonId || submitting || isCompletedLesson) return;

        // Generate unique clientAttemptId for idempotency
        clientAttemptIdRef.current = crypto.randomUUID();
        setSubmitting(true);
        setSubmitError(null);

        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

        submitMutation.mutate(
            {
                lessonId,
                payload: {
                    clientAttemptId: clientAttemptIdRef.current,
                    responses: {} as Record<string, unknown>,
                    durationSeconds,
                },
            },
            {
                onSuccess: (result) => {
                    setSubmissionState({ lessonId, result });
                    setSubmitting(false);
                },
                onError: (error) => {
                    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể nộp bài. Vui lòng thử lại.';
                    setSubmitError(message);
                    setSubmitting(false);
                },
            },
        );
    }, [lessonId, submitting, isCompletedLesson, submitMutation]);

    const handleComplete = useCallback(() => {
        if (!lessonId || submitting || isCompletedLesson) return;

        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        clientAttemptIdRef.current = crypto.randomUUID();
        setSubmitting(true);
        setSubmitError(null);

        submitMutation.mutate(
            {
                lessonId,
                payload: {
                    clientAttemptId: clientAttemptIdRef.current,
                    responses: { _completed: true } as Record<string, unknown>,
                    durationSeconds,
                },
            },
            {
                onSuccess: (result) => {
                    setSubmissionState({ lessonId, result });
                    setSubmitting(false);
                },
                onError: (error) => {
                    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể hoàn thành bài học. Vui lòng thử lại.';
                    setSubmitError(message);
                    setSubmitting(false);
                },
            },
        );
    }, [lessonId, submitting, isCompletedLesson, submitMutation]);

    const handleResetResult = useCallback(() => {
        setSubmissionState(null);
        setSubmitError(null);
        clientAttemptIdRef.current = '';
    }, []);

    // ── Navigation handlers ──────────────────────────────────────────────────

    const handlePrevious = useCallback(() => {
        if (prevLessonId) navigate(PATHS.LESSON_PLAYER(prevLessonId));
    }, [prevLessonId, navigate]);

    const handleNext = useCallback(() => {
        if (nextLessonId) navigate(PATHS.LESSON_PLAYER(nextLessonId));
    }, [nextLessonId, navigate]);

    const handleBackToCourse = useCallback(() => {
        if (courseSlug) navigate(PATHS.COURSE_DETAIL(courseSlug));
        else navigate(PATHS.DASHBOARD.HOME);
    }, [courseSlug, navigate]);

    // ── Loading ──
    if (isLoading) {
        return (
            <div className={styles.player}>
                <div className={styles.skeletonBar} />
                <div className={styles.skeletonContent} />
                <div className={styles.skeletonBar} />
            </div>
        );
    }

    // ── Error ──
    if (isError || !lessonData) {
        return (
            <div className={styles.player}>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Không thể tải bài học</p>
                    <p className={styles.stateDescription}>Có lỗi xảy ra. Vui lòng thử lại sau.</p>
                    <button type="button" className={styles.primaryButton} onClick={() => refetch()}>
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.player}>
            {/* ── Top bar ── */}
            <div className={styles.topBar}>
                <div className={styles.breadcrumb}>
                    <button type="button" className={styles.backButton} onClick={handleBackToCourse} aria-label="Quay lại khóa học">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                        </svg>
                        <span className={styles.breadcrumbText}>{roadmapData?.course.name ?? 'Khóa học'}</span>
                    </button>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span className={styles.breadcrumbCurrent}>{lessonData.lesson.title}</span>
                </div>
                <div className={styles.topRight}>
                    <span className={`${styles.saveStatus} ${styles[`save${autosaveStatus}`]}`}>
                        {autosaveStatus === 'saving' && 'Đang lưu...'}
                        {autosaveStatus === 'saved' && 'Đã lưu'}
                        {autosaveStatus === 'unsaved' && 'Chưa lưu'}
                        {autosaveStatus === 'conflict' && 'Xung đột'}
                    </span>
                    <button type="button" className={styles.roadmapToggle} onClick={() => setShowRoadmap((v) => !v)} aria-label={showRoadmap ? 'Ẩn danh sách bài học' : 'Hiện danh sách bài học'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className={styles.body}>
                {showRoadmap && roadmapData && (
                    <aside className={styles.roadmapSidebar}>
                        <h3 className={styles.roadmapTitle}>Danh sách bài học</h3>
                        {roadmapData.units.map((unit) => (
                            <div key={unit.id} className={styles.roadmapUnit}>
                                <span className={styles.roadmapUnitTitle}>{unit.title}</span>
                                {unit.lessons.map((lesson) => (
                                    <button key={lesson.id} type="button" className={`${styles.roadmapLesson} ${lesson.id === lessonId ? styles.roadmapLessonActive : ''}`} onClick={() => navigate(PATHS.LESSON_PLAYER(lesson.id))}>
                                        <span className={styles.lessonBadge}>
                                            {lesson.status === 'COMPLETED' ? '✓' : lesson.status === 'IN_PROGRESS' ? '●' : '○'}
                                        </span>
                                        <span className={styles.roadmapLessonTitle}>{lesson.title}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </aside>
                )}

                <main className={styles.contentArea}>
                    <div className={styles.lessonHeader}>
                        <span className={styles.lessonType}>{lessonData.lesson.type}</span>
                        <h1 className={styles.lessonTitle}>{lessonData.lesson.title}</h1>
                    </div>

                    <LessonRenderer lesson={lessonData} />

                    {isAssessed && !isCompletedLesson && (
                        <p className={styles.passingInfo}>Điểm đạt: {lessonData.lesson.passingScore}</p>
                    )}

                    {/* Submit error */}
                    {submitError && (
                        <div className={styles.submitError}>
                            <p>{submitError}</p>
                            <button type="button" className={styles.retrySubmitButton} onClick={() => setSubmitError(null)}>Đóng</button>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Bottom bar ── */}
            <div className={styles.bottomBar}>
                <button type="button" className={`${styles.navButton} ${!prevLessonId ? styles.navButtonDisabled : ''}`} onClick={handlePrevious} disabled={!prevLessonId}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                    </svg>
                    Bài trước
                </button>

                <div className={styles.bottomCenter}>
                    <span className={styles.saveIndicator}>
                        {autosaveStatus === 'saving' && 'Đang lưu...'}
                        {autosaveStatus === 'saved' && 'Đã lưu'}
                        {autosaveStatus === 'unsaved' && 'Chưa lưu'}
                        {autosaveStatus === 'conflict' && 'Xung đột'}
                    </span>

                    {/* Submit / Complete / Completed button */}
                    {isCompletedLesson ? (
                        <span className={styles.completedBadge}>✓ Đã hoàn thành</span>
                    ) : isAssessed ? (
                        <button
                            type="button"
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Đang nộp...' : 'Nộp bài'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.submitButton}
                            onClick={handleComplete}
                            disabled={submitting}
                        >
                            {submitting ? 'Đang xử lý...' : 'Hoàn thành'}
                        </button>
                    )}
                </div>

                <button type="button" className={`${styles.navButton} ${!nextLessonId ? styles.navButtonDisabled : ''}`} onClick={handleNext} disabled={!nextLessonId}>
                    Bài sau
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* ── Result overlay ── */}
            {displayedSubmissionResult && (
                <ResultPanel
                    courseSlug={courseSlug ?? ''}
                    result={displayedSubmissionResult}
                    isCompletedLesson={isCompletedLesson}
                    onReset={handleResetResult}
                />
            )}
        </div>
    );
};

export default LessonPlayerPage;
