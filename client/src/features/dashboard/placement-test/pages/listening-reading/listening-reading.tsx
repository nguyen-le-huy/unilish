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
import { SubmissionSuccessCard } from '../../components/listening-reading/submission-success-card';

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
}

const buildSubmissionSummary = (attemptData: {
    durationSeconds?: number | null;
    answerSheet: Array<{ selectedOption?: AnswerOption | null }>;
    totalQuestions: number;
}): SubmissionSummary => {
    const submittedQuestions = attemptData.answerSheet.filter((item) => Boolean(item.selectedOption)).length;
    const completedMinutes = typeof attemptData.durationSeconds === 'number'
        ? Math.max(1, Math.round(attemptData.durationSeconds / 60))
        : null;

    return {
        completedMinutes,
        submittedQuestions,
        totalQuestions: attemptData.totalQuestions,
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
            setSubmissionSummary(buildSubmissionSummary(result.attempt));
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
        submitAttemptMutation,
    ]);

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

    if (submissionSummary) {
        return (
            <div className={styles.successContainer}>
                <SubmissionSuccessCard
                    completedMinutes={submissionSummary.completedMinutes}
                    submittedQuestions={submissionSummary.submittedQuestions}
                    totalQuestions={submissionSummary.totalQuestions}
                    onContinue={() => navigate(PATHS.DASHBOARD.HOME)}
                    description="Bạn đã nộp thành công phần Listening và Reading."
                    continueLabel="Quay về Dashboard"
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h3 className={styles.title}>Bài thi đầu vào - Phần kỹ năng nghe và đọc</h3>
                <Button
                    type="button"
                    padding="B"
                    variant="outline"
                    onClick={() => navigate(PATHS.DASHBOARD.HOME)}
                >
                    Thoát
                </Button>
            </header>
            <div className={styles.main}>
                <LeftPanel
                    activePart={activePart}
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
    );
};

export default ListeningReading;