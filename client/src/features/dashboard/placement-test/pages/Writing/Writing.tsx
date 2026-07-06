import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import styles from './Writing.module.css';
import writingQuestionImage from '@/assets/images/writingques.png';
import { Button } from '@/components/core/Button';
import { Loading } from '@/components/common/Loading/Loading';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';
import { usePlacementTestStore } from '@/stores/placement-test.store';
import { WritingEditorPanel, WritingPromptPanel, WritingSubmissionOverlay } from '../../components/writing';
import { useWritingSession } from '../../hooks/use-writing-session';
import { useWritingSubmit } from '../../hooks/use-writing-submit';
import { useWritingTimer } from '../../hooks/use-writing-timer';

const formatClock = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getSubmitButtonLabel = (isSubmitting: boolean, submitState: 'idle' | 'grading' | 'done'): string => {
    if (isSubmitting) {
        return 'Đang nộp...';
    }

    if (submitState === 'grading') {
        return 'Đang chấm điểm...';
    }

    return 'Nộp bài';
};

const Writing = () => {
    const navigate = useNavigate();
    const [isSubmittedCardOpen, setIsSubmittedCardOpen] = useState(false);
    const [essay, setEssay] = useState('');
    const hasAutoSubmittedRef = useRef(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const sessionId = usePlacementTestStore((state) => state.sessionId);
    const lrRawScore = usePlacementTestStore((state) => state.lrRawScore);
    const setCurrentModule = usePlacementTestStore((state) => state.setCurrentModule);
    const setWritingAttemptId = usePlacementTestStore((state) => state.setWritingAttemptId);
    const cachedEssayModule = usePlacementTestStore((state) => state.essayModule);

    const {
        data: writingSession,
        isLoading: isLoadingWritingSession,
        isError: isWritingSessionError,
    } = useWritingSession(sessionId, lrRawScore, isAuthenticated);

    const {
        submitEssay,
        isSubmitting,
        isSuccess,
    } = useWritingSubmit({ sessionId });

    const promptImageSrc = writingSession?.promptImageUrl?.trim()
        || cachedEssayModule?.promptImageUrl?.trim()
        || writingQuestionImage;
    const promptText = writingSession?.prompt?.trim() || 'Chưa có đề Writing trong bài kiểm tra hiện tại.';
    const timeLimitMinutes = Math.max(1, writingSession?.timeLimitMinutes ?? cachedEssayModule?.timeLimitMinutes ?? 30);

    const wordCount = essay
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;

    const submitWriting = async (currentRemainingSeconds: number) => {
        if (!sessionId || !writingSession?.writingAttemptId || isSubmitting || isSuccess) {
            return;
        }

        const elapsedSeconds = Math.max(0, timeLimitMinutes * 60 - currentRemainingSeconds);

        try {
            await submitEssay({
                writingAttemptId: writingSession.writingAttemptId,
                essay,
                wordCount,
                durationSeconds: elapsedSeconds,
            });
            setIsSubmittedCardOpen(true);
        } catch {
            toast.error('Không thể nộp phần Writing. Vui lòng thử lại.');
        }
    };

    const { remainingSeconds } = useWritingTimer({
        timeLimitMinutes,
        isActive: Boolean(writingSession?.writingAttemptId) && !isSuccess,
        onExpire: () => {
            if (hasAutoSubmittedRef.current) {
                return;
            }

            hasAutoSubmittedRef.current = true;
            void submitWriting(0);
        },
    });

    const submitState: 'idle' | 'grading' | 'done' = isSubmitting ? 'grading' : isSuccess ? 'done' : 'idle';
    const canManualSubmit = !isSubmitting && !isSuccess;
    const hasTimedOut = remainingSeconds <= 0;
    const timeLabel = formatClock(remainingSeconds);

    useEffect(() => {
        if (!writingSession?.writingAttemptId) {
            return;
        }

        setWritingAttemptId(writingSession.writingAttemptId);
        setCurrentModule('writing');
    }, [setCurrentModule, setWritingAttemptId, writingSession?.writingAttemptId]);

    const handleContinue = () => {
        setCurrentModule('speaking');
        navigate(PATHS.DASHBOARD.PLACEMENT_TEST.SPEAKING);
    };

    if (!isAuthenticated) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    if (!sessionId || typeof lrRawScore !== 'number') {
        return <Navigate to={PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING} replace />;
    }

    if (isLoadingWritingSession) {
        return <Loading />;
    }

    if (isWritingSessionError || !writingSession) {
        return (
            <div className={styles.errorState} role="alert">
                <p>Không thể khởi tạo phần Writing. Vui lòng quay lại và thử lại.</p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING)}
                >
                    Quay lại phần Listening & Reading
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className={styles.page}>
                <header className={styles.pageHeader}>
                    <div className={styles.headerCopy}>
                        <span className={styles.eyebrow}>Bài đánh giá năng lực CEFR</span>
                        <h1>Kiểm tra kỹ năng Viết</h1>
                        <p>Đọc kỹ đề bài, phân tích dữ liệu và trình bày câu trả lời bằng tiếng Anh.</p>
                    </div>

                    <div className={styles.moduleProgress} aria-label="Tiến trình bài kiểm tra">
                        <span>Phần 2 / 3</span>
                        <strong>Writing</strong>
                    </div>
                </header>

                <main className={styles.writing}>
                    <WritingPromptPanel promptText={promptText} promptImageSrc={promptImageSrc} />
                    <WritingEditorPanel
                        essay={essay}
                        wordCount={wordCount}
                        timeLabel={timeLabel}
                        hasTimedOut={hasTimedOut}
                        isTextareaDisabled={submitState === 'grading' || submitState === 'done'}
                        canManualSubmit={canManualSubmit}
                        submitButtonLabel={getSubmitButtonLabel(isSubmitting, submitState)}
                        onEssayChange={setEssay}
                        onSubmit={() => {
                            void submitWriting(remainingSeconds);
                        }}
                    />
                </main>
            </div>

            {isSubmittedCardOpen && (
                <WritingSubmissionOverlay
                    description={'Bạn đã nộp thành công phần Writing.\nVui lòng chuẩn bị cho các phần tiếp theo.'}
                    stats={[
                        { label: 'Thời gian hoàn thành', value: `${Math.max(1, Math.round((timeLimitMinutes * 60 - remainingSeconds) / 60))}p` },
                        { label: 'Số từ đã nộp', value: String(wordCount) },
                    ]}
                    continueLabel="Tiếp tục phần Speaking"
                    onContinue={handleContinue}
                />
            )}
        </>
    );
};

export default Writing;
