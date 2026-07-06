import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLesson, useStartLesson, useSaveCheckpoint, useSubmitLesson, useRestartLesson, useCompleteLesson } from '../../hooks/use-lesson';
import { useCourseRoadmap } from '../../hooks/use-course-roadmap';
import { useExerciseState } from '../../hooks/use-exercise-state';
import { useAutosave } from '../../hooks/use-autosave';
import { derivePhase, type ExercisePhase } from '../../hooks/use-phase';
import { adaptLessonToProps } from '../../components/renderers/renderer.types';
import LessonRenderer from '../../components/renderers/LessonRenderer';
import ResultPanel from '../../components/result/ResultPanel';
import type { SubmissionResult } from '../../api/submit-lesson';
import type {
    LessonSubmissionKind,
    ExerciseCheckpointKind,
} from '../../types/learning.types';
import { PATHS } from '@/config/paths';
import styles from './LessonPlayerPage.module.css';

// Exercises remain configurable in admin/backend but are intentionally hidden
// from the learner lesson player.
const LEARNER_EXERCISES_ENABLED: boolean = false;

const LESSON_TYPE_LABELS: Record<string, string> = {
    VOCAB: 'Từ vựng',
    GRAMMAR: 'Ngữ pháp',
    READING: 'Đọc hiểu',
    LISTENING: 'Nghe hiểu',
    SPEAKING: 'Luyện nói',
    WRITING: 'Luyện viết',
    UNIT_TEST: 'Kiểm tra',
};

const LessonPlayerPage = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    // ── Lesson data ────────────────────────────────────────────────────
    const { data: lessonData, isLoading, isError, refetch } = useLesson(lessonId);
    const { mutate: startLesson } = useStartLesson();
    const saveCheckpointMutation = useSaveCheckpoint();
    const submitMutation = useSubmitLesson();
    const restartMutation = useRestartLesson();
    const completeLessonMutation = useCompleteLesson();
    const startedLessonIdRef = useRef<string | null>(null);

    const courseSlug = lessonData?.course.slug;
    const { data: roadmapData } = useCourseRoadmap(courseSlug);

    // ── Derived lesson properties ──────────────────────────────────────
    const prevLessonId = lessonData?.navigation.previousLessonId ?? null;
    const nextLessonId = lessonData?.navigation.nextLessonId ?? null;
    const rawIsCompletedLesson = LEARNER_EXERCISES_ENABLED
        && lessonData?.progress.status === 'COMPLETED';

    const exercise = LEARNER_EXERCISES_ENABLED
        ? lessonData?.lesson.exercise
        : undefined;
    const exerciseKind = exercise?.kind ?? null;

    const hasSubmission =
        exerciseKind === 'OBJECTIVE' ||
        exerciseKind === 'SPEAKING' ||
        exerciseKind === 'WRITING';
    const hasCompletionState = hasSubmission;

    // Extract exercise section props via adapter
    const { exercise: adaptedExerciseSection } = useMemo(() => {
        if (!lessonData) return { content: null, exercise: null };
        return adaptLessonToProps(lessonData);
    }, [lessonData]);
    const exerciseSection = LEARNER_EXERCISES_ENABLED
        ? adaptedExerciseSection
        : null;

    // Extract questions for objective exercise state
    const questions = useMemo(() => {
        if (exercise?.kind === 'OBJECTIVE' && exercise.mode === 'FIXED') {
            return exercise.questions;
        }
        return [];
    }, [exercise]);

    // ── Navigation state ───────────────────────────────────────────────
    const [showRoadmap, setShowRoadmap] = useState(true);

    // ── Start time for duration tracking ───────────────────────────────
    const startTimeRef = useRef<number>(0);
    const lastSaveTimeRef = useRef<number>(0);

    // Start/resume lesson on load (idempotent)
    useEffect(() => {
        if (!lessonId || isLoading || !lessonData || startedLessonIdRef.current === lessonId) {
            return;
        }
        startedLessonIdRef.current = lessonId;
        startLesson(lessonId);
        startTimeRef.current = Date.now();
        lastSaveTimeRef.current = Date.now();
    }, [lessonId, isLoading, lessonData, startLesson]);

    // ── Exercise state (typed answer management for OBJECTIVE) ─────────
    const savedCheckpoint = lessonData?.progress.checkpoint as ExerciseCheckpointKind | null;

    const exerciseState = useExerciseState({
        questions,
        savedCheckpoint,
    });

    // ── Writing text state ─────────────────────────────────────────────
    const [writingText, setWritingText] = useState('');
    const writingTextRef = useRef(writingText);
    useEffect(() => { writingTextRef.current = writingText; }, [writingText]);

    // ── Speaking session state ─────────────────────────────────────────
    const [speakingSessionId, setSpeakingSessionId] = useState<string | null>(null);

    // ── Phase management ───────────────────────────────────────────────
    const [hasStarted, setHasStarted] = useState(false);
    const [dismissedRestoredResult, setDismissedRestoredResult] = useState(false);
    const [submissionState, setSubmissionState] = useState<{
        lessonId: string;
        result: SubmissionResult;
    } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isStale, setIsStale] = useState(false);
    const [restartingLesson, setRestartingLesson] = useState(false);
    const [completeError, setCompleteError] = useState<string | null>(null);

    const currentSubmissionResult =
        submissionState && submissionState.lessonId === lessonId
            ? submissionState.result
            : null;

    // Derive phase from current state
    const phase: ExercisePhase = useMemo(() => {
        return derivePhase({
            isLoading,
            isError,
            hasLessonData: !!lessonData,
            exercise: exerciseSection,
        progressStatus: LEARNER_EXERCISES_ENABLED
            ? lessonData?.progress.status
            : undefined,
            hasStarted,
            isSubmitting: submitting,
            submissionResult: currentSubmissionResult,
            dismissedRestoredResult,
            isStale,
        });
    }, [
        isLoading, isError, lessonData, exerciseSection,
        hasStarted, submitting, currentSubmissionResult,
        dismissedRestoredResult, isStale,
    ]);

    const isReviewPhase = phase === 'REVIEW';
    const isAnsweringPhase = phase === 'ANSWERING';
    const isReadyPhase = phase === 'READY';

    const isCompletedLesson = Boolean(
        rawIsCompletedLesson && hasCompletionState && !dismissedRestoredResult && !currentSubmissionResult,
    );

    useEffect(() => {
        setDismissedRestoredResult(false);
        setSubmissionState(null);
        setSubmitError(null);
        setValidationError(null);
        setRestartingLesson(false);
        setCompleteError(null);
        setIsStale(false);
    }, [lessonId]);

    // ── Restored submission result (for REVIEW) ────────────────────────
    const restoredSubmissionResult = useMemo<SubmissionResult | null>(() => {
        if (
            dismissedRestoredResult ||
            !hasCompletionState ||
            lessonData?.progress.status !== 'COMPLETED' ||
            lessonData.progress.bestScore === null
        ) {
            return null;
        }
        return {
            attemptId: 'restored',
            score: lessonData.progress.bestScore,
            passed: true,
            latestScore: lessonData.progress.bestScore,
            bestScore: lessonData.progress.bestScore,
            feedback: null,
            progress: {
                lessonStatus: 'COMPLETED',
                unitStatus: 'COMPLETED' as const,
                courseStatus: 'ACTIVE' as const,
                courseProgressPercent: 0,
            },
            nextLessonId: lessonData.navigation.nextLessonId,
        };
    }, [dismissedRestoredResult, hasCompletionState, lessonData]);

    const displayedSubmissionResult =
        currentSubmissionResult ?? restoredSubmissionResult;

    // ── Autosave ───────────────────────────────────────────────────────
    const lessonIdRef = useRef(lessonId);
    useEffect(() => { lessonIdRef.current = lessonId; }, [lessonId]);

    const checkpointVersionRef = useRef(lessonData?.progress.checkpointVersion ?? 0);
    useEffect(() => {
        if (lessonData?.progress.checkpointVersion !== undefined) {
            checkpointVersionRef.current = lessonData.progress.checkpointVersion;
        }
    }, [lessonData?.progress.checkpointVersion]);

    const buildCheckpoint = useCallback((): ExerciseCheckpointKind | null => {
        if (exerciseKind === 'OBJECTIVE') {
            const answers = exerciseState.getSubmissionAnswers();
            if (answers.length === 0) return null;
            return {
                kind: 'OBJECTIVE',
                answers,
                currentQuestionIndex: exerciseState.currentQuestionIndex,
            };
        }
        if (exerciseKind === 'WRITING') {
            return {
                kind: 'WRITING',
                text: writingTextRef.current,
                warmupAnswers: {},
            };
        }
        if (exerciseKind === 'SPEAKING') {
            return {
                kind: 'SPEAKING',
                sessionId: speakingSessionId,
            };
        }
        return null;
    }, [exerciseKind, exerciseState, speakingSessionId]);

    const saveFn = useCallback(async (): Promise<{ success: boolean; conflict: boolean; permissionDenied?: boolean }> => {
        // Objective exercises are completed locally and submitted once. They
        // deliberately do not create checkpoints, avoiding version conflicts.
        if (exerciseKind === 'OBJECTIVE') {
            return { success: true, conflict: false };
        }

        const currentLessonId = lessonIdRef.current;
        if (!currentLessonId) return { success: false, conflict: false };

        const checkpoint = buildCheckpoint();
        if (!checkpoint) return { success: true, conflict: false };

        const now = Date.now();
        const activeSecondsDelta = Math.round((now - lastSaveTimeRef.current) / 1000);
        lastSaveTimeRef.current = now;

        const save = (version: number) => saveCheckpointMutation.mutateAsync({
            lessonId: currentLessonId,
            payload: {
                version,
                checkpoint,
                activeSecondsDelta,
                conflictStrategy: 'LAST_WRITE_WINS',
            },
        });

        try {
            const result = await save(checkpointVersionRef.current);

            if (result.checkpointVersion > checkpointVersionRef.current) {
                checkpointVersionRef.current = result.checkpointVersion;
            }

            return { success: true, conflict: false };
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as {
                    response: {
                        status: number;
                        headers?: Record<string, string>;
                        data?: {
                            message?: string;
                            data?: { latestVersion?: number };
                        };
                    };
                };
                const status = axiosErr.response?.status;
                if (status === 401 || status === 403) {
                    return { success: false, conflict: false, permissionDenied: true };
                }
                if (status === 409) {
                    const latestVersion = axiosErr.response.data?.data?.latestVersion;
                    if (typeof latestVersion === 'number') {
                        checkpointVersionRef.current = latestVersion;

                        try {
                            const retryResult = await save(latestVersion);
                            checkpointVersionRef.current = retryResult.checkpointVersion;
                            return { success: true, conflict: false };
                        } catch (retryError: unknown) {
                            if (retryError && typeof retryError === 'object' && 'response' in retryError) {
                                const retryResponse = (retryError as {
                                    response?: {
                                        status?: number;
                                        data?: { data?: { latestVersion?: number } };
                                    };
                                }).response;
                                const retryLatestVersion = retryResponse?.data?.data?.latestVersion;
                                if (typeof retryLatestVersion === 'number') {
                                    checkpointVersionRef.current = retryLatestVersion;
                                }
                            }
                        }
                    }
                    return { success: false, conflict: true };
                }
                // 429: preserve answers, server message shown via generic error
            }
            return { success: false, conflict: false };
        }
    }, [exerciseKind, buildCheckpoint, saveCheckpointMutation]);

    const autosave = useAutosave({
        saveFn,
        debounceMs: 2000,
        throttleMs: 20000,
    });

    // Mark dirty when writing text changes
    const prevWritingTextLength = useRef(writingText.length);
    useEffect(() => {
        if (writingText.length !== prevWritingTextLength.current) {
            prevWritingTextLength.current = writingText.length;
            autosave.markDirty();
        }
    }, [writingText, autosave]);

    const usesAutosave = exerciseKind === 'WRITING' || exerciseKind === 'SPEAKING';
    const saveStatusLabel = !usesAutosave ? null
        :
        autosave.status === 'saving' ? 'Đang lưu...'
        : autosave.status === 'unsaved' ? 'Chưa lưu'
        : autosave.status === 'conflict' ? 'Xung đột'
        : autosave.status === 'error' ? 'Lỗi lưu'
        : autosave.status === 'offline' ? 'Không có kết nối'
        : autosave.status === 'permissionDenied' ? 'Không có quyền'
        : null;

    // ── Focused question for validation ────────────────────────────────
    const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);

    // ── clientAttemptId management ─────────────────────────────────────
    const clientAttemptIdRef = useRef<string>('');
    const hasSubmitError = submitError !== null;

    const getOrCreateAttemptId = useCallback((): string => {
        if (!clientAttemptIdRef.current || !hasSubmitError) {
            clientAttemptIdRef.current = crypto.randomUUID();
        }
        return clientAttemptIdRef.current;
    }, [hasSubmitError]);

    // ── Submit handler (OBJECTIVE) ─────────────────────────────────────
    const handleObjectiveSubmit = useCallback(async () => {
        if (!lessonId || submitting || isCompletedLesson) return;

        const validation = exerciseState.validateComplete();
        if (!validation.valid) {
            setValidationError(
                `Vui lòng trả lời ${validation.missingCount} câu hỏi trước khi nộp bài.`,
            );
            setFocusedQuestionId(validation.firstMissingId);
            setTimeout(() => setFocusedQuestionId(null), 1000);
            return;
        }
        setValidationError(null);

        const clientAttemptId = getOrCreateAttemptId();
        setSubmitting(true);
        setSubmitError(null);

        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const answers = exerciseState.getSubmissionAnswers();

        const submission: LessonSubmissionKind = {
            kind: 'OBJECTIVE',
            answers,
        };

        submitMutation.mutate(
            {
                lessonId,
                payload: { clientAttemptId, submission, durationSeconds },
            },
            {
                onSuccess: (result) => {
                    setSubmissionState({ lessonId, result });
                    setSubmitting(false);
                },
                onError: (error) => {
                    if ((error as { response?: { status: number }})?.response?.status === 409) {
                        setIsStale(true);
                    }
                    setSubmitError('Không thể nộp bài. Vui lòng thử lại.');
                    setSubmitting(false);
                },
            },
        );
    }, [lessonId, submitting, isCompletedLesson, exerciseState, getOrCreateAttemptId, submitMutation]);

    // ── Submit handler (WRITING) ───────────────────────────────────────
    const handleWritingSubmit = useCallback(async () => {
        if (!lessonId || submitting || isCompletedLesson) return;

        const text = writingTextRef.current.trim();
        if (!text) {
            setValidationError('Vui lòng viết câu trả lời trước khi nộp.');
            return;
        }
        setValidationError(null);

        await autosave.flush();

        const clientAttemptId = getOrCreateAttemptId();
        setSubmitting(true);
        setSubmitError(null);

        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const submission: LessonSubmissionKind = { kind: 'WRITING', text };

        submitMutation.mutate(
            { lessonId, payload: { clientAttemptId, submission, durationSeconds } },
            {
                onSuccess: (result) => {
                    setSubmissionState({ lessonId, result });
                    setSubmitting(false);
                    autosave.reset();
                },
                onError: () => {
                    setSubmitError('Không thể nộp bài. Vui lòng thử lại.');
                    setSubmitting(false);
                },
            },
        );
    }, [lessonId, submitting, isCompletedLesson, autosave, getOrCreateAttemptId, submitMutation]);

    // ── Submit handler (SPEAKING) ──────────────────────────────────────
    const handleSpeakingSubmit = useCallback(async () => {
        if (!lessonId || submitting || isCompletedLesson) return;

        if (!speakingSessionId) {
            setValidationError('Vui lòng hoàn thành phần ghi âm trước khi nộp.');
            return;
        }
        setValidationError(null);

        await autosave.flush();

        const clientAttemptId = getOrCreateAttemptId();
        setSubmitting(true);
        setSubmitError(null);

        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const submission: LessonSubmissionKind = { kind: 'SPEAKING', sessionId: speakingSessionId };

        submitMutation.mutate(
            { lessonId, payload: { clientAttemptId, submission, durationSeconds } },
            {
                onSuccess: (result) => {
                    setSubmissionState({ lessonId, result });
                    setSubmitting(false);
                    autosave.reset();
                },
                onError: () => {
                    setSubmitError('Không thể nộp bài. Vui lòng thử lại.');
                    setSubmitting(false);
                },
            },
        );
    }, [lessonId, submitting, isCompletedLesson, speakingSessionId, autosave, getOrCreateAttemptId, submitMutation]);

    // ── Reset result (for retry) ───────────────────────────────────────
    const handleResetResult = useCallback(() => {
        setSubmissionState(null);
        setSubmitError(null);
        setValidationError(null);
        setHasStarted(true);
        clientAttemptIdRef.current = crypto.randomUUID();
    }, []);

    const handleRestartLesson = useCallback(async () => {
        if (!lessonId || restartingLesson || restartMutation.isPending) return;

        setRestartingLesson(true);
        setSubmitError(null);
        setValidationError(null);

        try {
            await restartMutation.mutateAsync(lessonId);
            setSubmissionState(null);
            setDismissedRestoredResult(true);
            setHasStarted(false);
            setIsStale(false);
            clientAttemptIdRef.current = crypto.randomUUID();
            checkpointVersionRef.current = 0;
            startTimeRef.current = Date.now();
            lastSaveTimeRef.current = Date.now();
            setWritingText('');
            setSpeakingSessionId(null);
            exerciseState.resetAnswers();
            autosave.reset();
            await refetch();
        } catch {
            setSubmitError('Không thể bắt đầu làm lại bài học. Vui lòng thử lại.');
        } finally {
            setRestartingLesson(false);
        }
    }, [lessonId, restartingLesson, restartMutation, exerciseState, autosave, refetch]);

    // ── Handle stale question set reload ────────────────────────────────
    const handleReloadForStale = useCallback(() => {
        setIsStale(false);
        refetch();
    }, [refetch]);

    // ── Pick submit handler ────────────────────────────────────────────
    const handleSubmit = useCallback(() => {
        switch (exerciseKind) {
            case 'OBJECTIVE': return handleObjectiveSubmit();
            case 'WRITING': return handleWritingSubmit();
            case 'SPEAKING': return handleSpeakingSubmit();
            default: return undefined;
        }
    }, [exerciseKind, handleObjectiveSubmit, handleWritingSubmit, handleSpeakingSubmit]);

    // ── Navigation handlers (flush autosave before leaving) ────────────
    const handlePrevious = useCallback(async () => {
        if (usesAutosave) await autosave.flush();
        if (prevLessonId) navigate(PATHS.LESSON_PLAYER(prevLessonId));
    }, [prevLessonId, navigate, autosave, usesAutosave]);

    const handleNext = useCallback(async () => {
        if (usesAutosave) await autosave.flush();
        if (nextLessonId) navigate(PATHS.LESSON_PLAYER(nextLessonId));
    }, [nextLessonId, navigate, autosave, usesAutosave]);

    const handleBackToCourse = useCallback(async () => {
        if (usesAutosave) await autosave.flush();
        if (courseSlug) navigate(PATHS.COURSE_DETAIL(courseSlug));
        else navigate(PATHS.DASHBOARD.HOME);
    }, [courseSlug, navigate, autosave, usesAutosave]);

    const handleCompleteLesson = useCallback(async () => {
        if (!lessonId || completeLessonMutation.isPending) return;
        setCompleteError(null);
        try {
            await completeLessonMutation.mutateAsync(lessonId);
            await refetch();
        } catch {
            setCompleteError('Không thể đánh dấu hoàn thành. Vui lòng thử lại.');
        }
    }, [lessonId, completeLessonMutation, refetch]);

    // ── Route guard — unsaved changes ─────────────────────────────────
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (usesAutosave && autosave.status !== 'saved') {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [autosave.status, usesAutosave]);

    // ── LOADING ──
    if (isLoading) {
        return (
            <div className={styles.player}>
                <div className={styles.skeletonBar} />
                <div className={styles.skeletonContent} />
                <div className={styles.skeletonBar} />
            </div>
        );
    }

    // ── ERROR ──
    if (isError || !lessonData) {
        return (
            <div className={styles.player}>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Không thể tải bài học</p>
                    <p className={styles.stateDescription}>
                        Có lỗi xảy ra. Vui lòng thử lại sau.
                    </p>
                    <button type="button" className={styles.primaryButton} onClick={() => refetch()}>
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    // ── UNAVAILABLE ──
    if (phase === 'UNAVAILABLE') {
        return (
            <div className={styles.player}>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Bài tập hiện không khả dụng</p>
                    <p className={styles.stateDescription}>
                        Nội dung bài học có thể chưa được cập nhật. Vui lòng thử lại sau.
                    </p>
                    <button type="button" className={styles.primaryButton} onClick={() => refetch()}>
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    // ── STALE ──
    if (isStale) {
        return (
            <div className={styles.player}>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Nội dung đã thay đổi</p>
                    <p className={styles.stateDescription}>
                        Câu hỏi của bài học đã được cập nhật. Câu trả lời cũ đã được giữ lại tạm thời.
                        Vui lòng tải lại nội dung để tiếp tục. Các câu trả lời không còn tương thích sẽ được bỏ qua.
                    </p>
                    <button type="button" className={styles.primaryButton} onClick={handleReloadForStale}>
                        Tải lại nội dung
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
                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={handleBackToCourse}
                        aria-label="Quay lại khóa học"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                        <span className={styles.breadcrumbText}>
                            {roadmapData?.course.name ?? 'Khóa học'}
                        </span>
                    </button>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span className={styles.breadcrumbCurrent}>
                        {lessonData.lesson.title}
                    </span>
                </div>
                <div className={styles.topRight}>
                    {saveStatusLabel && isAnsweringPhase && (
                        <span
                            className={`${styles.saveStatus} ${styles[`save${autosave.status}`]}`}
                        >
                            {saveStatusLabel}
                        </span>
                    )}
                    <button
                        type="button"
                        className={styles.roadmapToggle}
                        onClick={() => setShowRoadmap((v) => !v)}
                        aria-label={showRoadmap ? 'Ẩn danh sách bài học' : 'Hiện danh sách bài học'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M4 6h16" />
                            <path d="M4 12h16" />
                            <path d="M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className={styles.body}>
                {showRoadmap && roadmapData && (
                    <aside className={styles.roadmapSidebar}>
                        <div className={styles.roadmapOverview}>
                            <div className={styles.roadmapOverviewTop}>
                                <div>
                                    <span className={styles.roadmapEyebrow}>Lộ trình khóa học</span>
                                    <h3 className={styles.roadmapTitle}>{roadmapData.course.name}</h3>
                                </div>
                                <span className={styles.levelPill}>{roadmapData.course.level}</span>
                            </div>
                            <div className={styles.courseProgressMeta}>
                                <span>Tiến độ của bạn</span>
                                <strong>{Math.round(roadmapData.progressPercent)}%</strong>
                            </div>
                            <div className={styles.courseProgressTrack} aria-hidden="true">
                                <span style={{ width: `${Math.min(100, Math.max(0, roadmapData.progressPercent))}%` }} />
                            </div>
                        </div>
                        <p className={styles.roadmapSectionLabel}>Nội dung khóa học</p>
                        {roadmapData.units.map((unit) => (
                            <div key={unit.id} className={styles.roadmapUnit}>
                                <span className={styles.roadmapUnitTitle}>{unit.title}</span>
                                {unit.lessons.map((lesson) => (
                                    <button
                                        key={lesson.id}
                                        type="button"
                                        className={`${styles.roadmapLesson} ${lesson.id === lessonId ? styles.roadmapLessonActive : ''}`}
                                        onClick={() => {
                                            if (usesAutosave) void autosave.flush();
                                            navigate(PATHS.LESSON_PLAYER(lesson.id));
                                        }}
                                    >
                                        <span className={styles.lessonBadge}>
                                            {lesson.status === 'COMPLETED'
                                                ? '✓'
                                                : lesson.status === 'IN_PROGRESS'
                                                  ? '●'
                                                  : '○'}
                                        </span>
                                        <span className={styles.roadmapLessonTitle}>
                                            {lesson.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </aside>
                )}

                <main className={styles.contentArea}>
                    <div className={styles.lessonSurface}>
                    {/* Lesson header — shown before ANSWERING or in REVIEW */}
                    {!isAnsweringPhase && (
                        <div className={styles.lessonHeader}>
                            <div className={styles.lessonHeaderMeta}>
                                <span className={styles.lessonType}>
                                    <span className={styles.lessonTypeDot} aria-hidden="true" />
                                    {LESSON_TYPE_LABELS[lessonData.lesson.type] ?? lessonData.lesson.type}
                                </span>
                                <span className={styles.lessonOrder}>Bài {lessonData.lesson.orderIndex}</span>
                            </div>
                            <h1 className={styles.lessonTitle}>
                                {lessonData.lesson.title}
                            </h1>
                            <p className={styles.lessonSubtitle}>{lessonData.unit.title}</p>
                        </div>
                    )}

                    {/* Learner lessons currently render content only. */}
                    {isReadyPhase && (
                        <LessonRenderer
                            lesson={lessonData}
                            writingText={writingText}
                            onWritingTextChange={setWritingText}
                            speakingSessionId={speakingSessionId}
                            onSpeakingSessionChange={setSpeakingSessionId}
                        />
                    )}

                    {/* ── ANSWERING phase — all objective questions ── */}
                    {isAnsweringPhase && questions.length > 0 && (
                        <>
                            <LessonRenderer
                                lesson={lessonData}
                                exerciseAnswers={exerciseState.answers}
                                onExerciseAnswerChange={exerciseState.setAnswer}
                                onRemoveMatchingPair={exerciseState.removeMatchingPair}
                                showExerciseFeedback={false}
                                exerciseAnsweredCount={exerciseState.answeredCount}
                                exerciseTotalQuestions={exerciseState.totalQuestions}
                                focusedQuestionId={focusedQuestionId}
                                writingText={writingText}
                                onWritingTextChange={setWritingText}
                                speakingSessionId={speakingSessionId}
                                onSpeakingSessionChange={setSpeakingSessionId}
                            />

                            {/* Question navigation footer */}
                            {exerciseKind === 'OBJECTIVE' && (
                                <div className={styles.questionNav}>
                                    <div className={styles.questionNavCenter}>
                                        <span className={styles.answeredCount}>
                                            {exerciseState.answeredCount}/{questions.length} câu đã trả lời
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.submitButton}
                                        onClick={handleObjectiveSubmit}
                                        disabled={submitting || exerciseState.answeredCount !== questions.length}
                                    >
                                        {submitting ? 'Đang chấm bài...' : 'Nộp bài'}
                                    </button>
                                </div>
                            )}

                            {/* Validation error */}
                            {validationError && (
                                <div className={styles.submitError} role="alert">
                                    <p>{validationError}</p>
                                    <button
                                        type="button"
                                        className={styles.retrySubmitButton}
                                        onClick={() => setValidationError(null)}
                                    >
                                        Đóng
                                    </button>
                                </div>
                            )}

                            {/* Submit error */}
                            {submitError && (
                                <div className={styles.submitError} role="alert">
                                    <p>{submitError}</p>
                                    <button
                                        type="button"
                                        className={styles.retrySubmitButton}
                                        onClick={() => setSubmitError(null)}
                                    >
                                        Đóng
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── SUBMITTING phase ── */}
                    {phase === 'SUBMITTING' && (
                        <div className={styles.submittingOverlay}>
                            <p className={styles.submittingText}>Đang chấm bài...</p>
                        </div>
                    )}

                    {/* ── Non-objective ANSWERING render (SPEAKING/WRITING) ── */}
                    {isAnsweringPhase && questions.length === 0 && (
                        <LessonRenderer
                            lesson={lessonData}
                            exerciseAnswers={exerciseState.answers}
                            onExerciseAnswerChange={exerciseState.setAnswer}
                            showExerciseFeedback={false}
                            focusedQuestionId={focusedQuestionId}
                            writingText={writingText}
                            onWritingTextChange={setWritingText}
                            speakingSessionId={speakingSessionId}
                            onSpeakingSessionChange={setSpeakingSessionId}
                        />
                    )}

                    {/* Writing/Speaking submit button in bottom */}
                    {isAnsweringPhase && (exerciseKind === 'WRITING' || exerciseKind === 'SPEAKING') && (
                        <div className={styles.submitRow}>
                            <button
                                type="button"
                                className={styles.submitButton}
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Đang nộp...' : 'Nộp bài'}
                            </button>
                        </div>
                    )}
                    </div>
                </main>
            </div>

            {/* ── Bottom bar (lesson navigation) ── */}
            <div className={styles.bottomBar}>
                <button
                    type="button"
                    className={`${styles.navButton} ${!prevLessonId ? styles.navButtonDisabled : ''}`}
                    onClick={handlePrevious}
                    disabled={!prevLessonId}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                    </svg>
                    Bài trước
                </button>

                <div className={styles.bottomCenter}>
                    {lessonData.progress.status === 'COMPLETED' ? (
                        <span className={styles.completedBadge}>✓ Đã hoàn thành</span>
                    ) : (
                        <button
                            type="button"
                            className={styles.completeButton}
                            onClick={handleCompleteLesson}
                            disabled={completeLessonMutation.isPending}
                        >
                            {completeLessonMutation.isPending ? 'Đang cập nhật...' : '✓ Đánh dấu hoàn thành'}
                        </button>
                    )}
                    {isReviewPhase && (
                        <>
                            <span className={styles.completedBadge}>✓ Đã hoàn thành</span>
                            <button
                                type="button"
                                className={styles.retryButton}
                                onClick={handleRestartLesson}
                                disabled={restartingLesson || restartMutation.isPending}
                            >
                                {restartingLesson || restartMutation.isPending ? 'Đang xử lý...' : 'Làm lại'}
                            </button>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className={`${styles.navButton} ${!nextLessonId ? styles.navButtonDisabled : ''}`}
                    onClick={handleNext}
                    disabled={!nextLessonId}
                >
                    Bài sau
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {completeError && (
                <div className={styles.completeToast} role="alert">
                    {completeError}
                </div>
            )}

            {/* ── Result overlay ── */}
            {displayedSubmissionResult && phase !== 'STALE' && (
                <ResultPanel
                    courseSlug={courseSlug ?? ''}
                    result={displayedSubmissionResult}
                    isCompletedLesson={isCompletedLesson}
                    passingScore={lessonData.lesson.passingScore}
                    onReset={handleResetResult}
                    onRestartLesson={handleRestartLesson}
                    isRestartingLesson={restartingLesson || restartMutation.isPending}
                />
            )}
        </div>
    );
};

export default LessonPlayerPage;
