import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import type { ApiErrorResponse } from '@/types/common';
import styles from './listening-reading.module.css';
import { Button } from '@/components/core/Button';
import { Loading } from '@/components/common/Loading/Loading';
import { SUPPORTED_LANGUAGES } from '@/config/constants';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';
import { LeftPanel } from '../../components/listening-reading/left-panel';
import { RightPanel } from '../../components/listening-reading/right-panel';
import type { AnswerOption, ToeicPart } from '../../components/listening-reading/types';
import { PT_MESSAGES } from '../../constants/placement-test.constants';
import { useActivePlacementTestQuery } from '../../hooks/use-active-placement-test-query';
import { useAnswerState } from '../../hooks/use-answer-state';
import { useAutosave } from '../../hooks/use-autosave';
import { useCreatePlacementAttemptMutation } from '../../hooks/use-create-placement-attempt-mutation';
import { useSavePlacementAnswersMutation } from '../../hooks/use-save-placement-answers-mutation';
import { useSubmitPlacementAttemptMutation } from '../../hooks/use-submit-placement-attempt-mutation';
import { useTestTimer } from '../../hooks/use-test-timer';
import { mapAttemptToParts } from '../../utils/question-mapper';
import { formatCountdownLabel } from '../../utils/timer';
import { SubmissionSuccessCard } from '@/components/core/SubmissionSuccessCard';
import { usePlacementTestStore } from '@/stores/placement-test.store';
import { queryClient } from '@/lib/react-query';

const getErrorStatus = (error: unknown): number | undefined => {
    if (!isAxiosError<ApiErrorResponse>(error)) {
        return undefined;
    }

    return error.response?.status;
};

interface ErrorViewProps {
    message: string;
}

interface SubmissionSummary {
    completedMinutes: number | null;
    submittedQuestions: number;
    totalQuestions: number;
    score: number;
    currentLevel: string;
}

const buildSubmissionSummary = (attemptData: {
    durationSeconds?: number | null;
    answerSheet: Array<{ selectedOption?: AnswerOption | null }>;
    totalQuestions: number;
}, profileUpdate: {
    placementTestScore: number;
    currentLevel: string;
}): SubmissionSummary => {
    const submittedQuestions = attemptData.answerSheet.filter((item) => Boolean(item.selectedOption)).length;
    const completedMinutes = typeof attemptData.durationSeconds === 'number'
        ? Math.max(1, Math.round(attemptData.durationSeconds / 60))
        : null;

    return {
        completedMinutes,
        submittedQuestions,
        totalQuestions: attemptData.totalQuestions,
        score: profileUpdate.placementTestScore,
        currentLevel: profileUpdate.currentLevel,
    };
};

const ErrorView = ({ message }: ErrorViewProps) => {
    return (
        <div className={styles.container} role="alert">
            {message}
        </div>
    );
};

const ListeningReading = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);
    const [activePart, setActivePart] = useState<ToeicPart>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionSummary, setSubmissionSummary] = useState<SubmissionSummary | null>(null);
    const setAttemptId = usePlacementTestStore((state) => state.setAttemptId);
    const setLrRawScore = usePlacementTestStore((state) => state.setLrRawScore);
    const setCurrentModule = usePlacementTestStore((state) => state.setCurrentModule);

    const {
        data: activeTest,
        isLoading: isLoadingActive,
        isError: isActiveError,
        error: activeError,
    } = useActivePlacementTestQuery(SUPPORTED_LANGUAGES.default, isAuthenticated);
    const createAttemptMutation = useCreatePlacementAttemptMutation(activeTest?._id);
    const attempt = createAttemptMutation.data;
    const isLoadingAttempt = createAttemptMutation.isPending;
    const isAttemptError = createAttemptMutation.isError;
    const attemptError = createAttemptMutation.error;

    const saveAnswersMutation = useSavePlacementAnswersMutation();
    const submitAttemptMutation = useSubmitPlacementAttemptMutation();
    const { queueSave, flushPendingChanges, cancelScheduledSaves } = useAutosave({
        attemptId: attempt?.attemptId,
        saveAnswersMutation,
        autosaveErrorMessage: PT_MESSAGES.autosaveError,
    });
    const {
        handleAnswer,
        handleFlag,
        applyQuestionStates,
        buildQuestionStatuses,
    } = useAnswerState({
        attempt,
        isSubmitting,
        queueSave,
    });

    const timeRemaining = useTestTimer(attempt?.expiresAt);

    const mapped = useMemo(() => {
        if (!attempt) {
            return {
                partInfos: [],
                partQuestions: {},
                partGroups: {},
                partAudio: {},
                nextPartMap: {},
            };
        }

        return mapAttemptToParts(attempt);
    }, [attempt]);

    useEffect(() => {
        const firstPart = mapped.partInfos[0]?.part;
        if (firstPart) {
            setActivePart(firstPart);
        }
    }, [mapped.partInfos]);

    useEffect(() => {
        // 401 is handled by the render guard after logout updates auth state.
        const status = getErrorStatus(activeError) ?? getErrorStatus(attemptError);

        if (status === 401) {
            logout();
            return;
        }

        if (status === 404) {
            toast.error(PT_MESSAGES.noActiveTest);
        }
    }, [activeError, attemptError, logout]);

    const questions = useMemo(() => {
        return applyQuestionStates(mapped.partQuestions[activePart] ?? []);
    }, [activePart, applyQuestionStates, mapped.partQuestions]);

    const questionGroups = useMemo(() => {
        return applyQuestionStates(mapped.partGroups[activePart] ?? []);
    }, [activePart, applyQuestionStates, mapped.partGroups]);

    const nextPart = mapped.nextPartMap[activePart];
    const audioSrc = mapped.partAudio[activePart];

    const questionStatuses = useMemo(() => {
        return buildQuestionStatuses(mapped.partInfos, mapped.partQuestions);
    }, [buildQuestionStatuses, mapped.partInfos, mapped.partQuestions]);

    const handleSubmit = useCallback(async () => {
        if (!attempt?.attemptId || isSubmitting) {
            return;
        }

        try {
            setIsSubmitting(true);
            cancelScheduledSaves();
            await flushPendingChanges(false);
            const result = await submitAttemptMutation.mutateAsync(attempt.attemptId);
            const lrRawScore = typeof result.attempt.scoring?.mcqScoreNormalized === 'number'
                ? Math.round(result.attempt.scoring.mcqScoreNormalized * 100)
                : result.profileUpdate.placementTestScore;

            // Update user profile with placement test results
            const currentUser = useAuthStore.getState().user;
            if (currentUser && result.profileUpdate) {
                const nextUser = {
                    ...currentUser,
                    currentLevel: result.profileUpdate.currentLevel,
                    placementTestScore: result.profileUpdate.placementTestScore,
                    weakSkills: result.profileUpdate.weakSkills,
                    placementTestCompletedAt: result.profileUpdate.placementTestCompletedAt ?? new Date().toISOString(),
                };

                useAuthStore.getState().setUser(nextUser);
                queryClient.setQueryData(['auth', 'me'], nextUser);
            }

            setAttemptId(attempt.attemptId);
            setLrRawScore(lrRawScore);
            setCurrentModule('result');
            setSubmissionSummary(buildSubmissionSummary(result.attempt, result.profileUpdate));
        } catch {
            toast.error(PT_MESSAGES.submitError);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        attempt?.attemptId,
        cancelScheduledSaves,
        flushPendingChanges,
        isSubmitting,
        setAttemptId,
        setCurrentModule,
        setLrRawScore,
        submitAttemptMutation,
    ]);

    const hasExpired = attempt?.expiresAt ? timeRemaining === 0 : false;

    const handleExit = useCallback(async () => {
        cancelScheduledSaves();
        try {
            await flushPendingChanges(false);
        } catch {
            // Pending answers remain in the in-memory attempt and will be retried on return.
        }
        navigate(PATHS.DASHBOARD.HOME);
    }, [cancelScheduledSaves, flushPendingChanges, navigate]);

    useEffect(() => {
        if (attempt?.attemptId) {
            setAttemptId(attempt.attemptId);
        }
    }, [attempt?.attemptId, setAttemptId]);

    useEffect(() => {
        if (hasExpired && !isSubmitting && !submissionSummary) {
            toast.info(PT_MESSAGES.timeUpInfo);
            void handleSubmit();
        }
    }, [hasExpired, isSubmitting, submissionSummary, handleSubmit]);

    if (!isAuthenticated) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    if (isLoadingActive || isLoadingAttempt) {
        return <Loading />;
    }

    if (isActiveError || isAttemptError || !attempt) {
        const status = getErrorStatus(activeError) ?? getErrorStatus(attemptError);

        if (status === 404) {
            return <ErrorView message={PT_MESSAGES.notFoundView} />;
        }

        if (status === 401) {
            return <ErrorView message={PT_MESSAGES.sessionExpiredView} />;
        }

        return <ErrorView message={PT_MESSAGES.loadErrorView} />;
    }

    const timerLabel = formatCountdownLabel(timeRemaining);

    return (
        <>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerCopy}>
                        <span className={styles.eyebrow}>Bài đánh giá năng lực CEFR</span>
                        <h1 className={styles.title}>Kiểm tra kỹ năng Nghe &amp; Đọc</h1>
                        <p>Hoàn thành từng phần để hệ thống xác định trình độ phù hợp nhất với bạn.</p>
                    </div>
                    <Button
                        type="button"
                        padding="B"
                        variant="outline"
                        className={styles.exitButton}
                        onClick={() => { void handleExit(); }}
                    >
                        ← Thoát bài kiểm tra
                    </Button>
                </header>
                <div className={styles.main}>
                    <LeftPanel
                        activePart={activePart}
                        availableParts={mapped.partInfos.map((item) => item.part)}
                        audioSrc={audioSrc}
                        questions={questions}
                        questionGroups={questionGroups}
                        nextPart={nextPart}
                        onPartSelect={setActivePart}
                        onAnswer={handleAnswer}
                        onFlag={handleFlag}
                        onSubmitTest={() => {
                            void handleSubmit();
                        }}
                        isSubmitPending={isSubmitting}
                    />
                    <RightPanel
                        parts={mapped.partInfos}
                        timeRemainingLabel={timerLabel}
                        questionStatuses={questionStatuses}
                        activePart={activePart}
                        isSubmitPending={isSubmitting}
                        onSubmit={() => {
                            void handleSubmit();
                        }}
                    />
                </div>
            </div>

            {submissionSummary && (
                <div className={styles.overlay} role="dialog" aria-modal="true">
                    <SubmissionSuccessCard
                        stats={[
                            { label: 'Trình độ CEFR', value: submissionSummary.currentLevel },
                            { label: 'Điểm tổng', value: `${submissionSummary.score}%` },
                            { label: 'Thời gian hoàn thành', value: submissionSummary.completedMinutes ? `${submissionSummary.completedMinutes}p` : '--' },
                            { label: 'Số câu đã nộp', value: `${submissionSummary.submittedQuestions}/${submissionSummary.totalQuestions}` },
                        ]}
                        onContinue={() => navigate(PATHS.DASHBOARD.RECOMMEND_COURSE)}
                        description={"Bạn đã hoàn thành bài kiểm tra đầu vào.\nHệ thống đã cập nhật trình độ và sẵn sàng đề xuất lộ trình phù hợp."}
                        continueLabel="Xem khóa học phù hợp"
                    />
                </div>
            )}
        </>
    );
};

export default ListeningReading;
