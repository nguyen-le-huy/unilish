import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import styles from './Writting.module.css';
import imageQues from '@/assets/images/writtingques.png';
import { Button } from '@/components/core/Button';
import { SubmissionSuccessCard } from '@/components/core/SubmissionSuccessCard';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { useAuthStore } from '@/stores/auth.store';
import { usePlacementTestStore } from '@/stores/placement-test.store';
import { useWritingSession } from '../../hooks/use-writing-session';
import { useWritingTimer } from '../../hooks/use-writing-timer';
import { useWritingSubmit } from '../../hooks/use-writing-submit';

const formatClock = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const Writting = () => {
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
        submitState,
        isSubmitting,
        hasTimedOut,
    } = useWritingSubmit({ sessionId });

    const promptImageSrc = writingSession?.promptImageUrl?.trim()
        || cachedEssayModule?.promptImageUrl?.trim()
        || imageQues;
    const promptText = writingSession?.prompt?.trim() || 'Chưa có đề Writing trong bài kiểm tra hiện tại.';
    const timeLimitMinutes = Math.max(1, writingSession?.timeLimitMinutes ?? cachedEssayModule?.timeLimitMinutes ?? 30);
    const minWordLimit = Math.max(1, writingSession?.wordLimit ?? cachedEssayModule?.wordLimits?.mid ?? 150);

    const wordCount = essay
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
    const canManualSubmit = !isSubmitting && submitState !== 'grading' && submitState !== 'done';

    const submitWriting = async () => {
        if (!sessionId || !writingSession?.writingAttemptId || submitState === 'grading' || isSubmitting) {
            return;
        }

        const elapsedSeconds = Math.max(0, timeLimitMinutes * 60 - remainingSeconds);

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
        isActive: Boolean(writingSession?.writingAttemptId) && !isSubmittedCardOpen && submitState !== 'done',
        onExpire: () => {
            if (hasAutoSubmittedRef.current) {
                return;
            }

            hasAutoSubmittedRef.current = true;
            void submitWriting();
        },
    });

    useEffect(() => {
        if (!writingSession?.writingAttemptId) {
            return;
        }

        setWritingAttemptId(writingSession.writingAttemptId);
        setCurrentModule('writing');
    }, [setCurrentModule, setWritingAttemptId, writingSession?.writingAttemptId]);

    useEffect(() => {
        if (!hasTimedOut) {
            return;
        }

        toast.error('Hệ thống đang bận, vui lòng thử lại.');
    }, [hasTimedOut]);

    const handleContinue = () => {
        setCurrentModule('speaking');
        navigate(PATHS.DASHBOARD.PLACEMENT_TEST.SPEAKING);
    };

    const timeLabel = formatClock(remainingSeconds);

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
            <div className={styles.writting}>
                <div className={styles.left}>
                    <div className={styles.title}>
                        <p>{promptText}</p>
                    </div>
                    <img src={promptImageSrc} alt="Writting Question" className={styles.imageQues} />
                </div>
                <div className={styles.right}>
                    <div className={styles.header}>
                        <p>Khu vực viết bài</p>
                        <p className={styles.wordCount}>Word count: {wordCount}</p>
                    </div>
                    <div className={styles.writtingArea}>
                        <textarea
                            className={styles.textArea}
                            placeholder="Nhập phần viết của bạn ở đây."
                            value={essay}
                            disabled={submitState === 'grading' || submitState === 'done'}
                            onChange={(event) => setEssay(event.target.value)}
                        />
                    </div>
                    <div className={styles.footer}>
                        <div className={styles.time}>
                            <p>Thời gian còn lại:</p>
                            <p>{timeLabel}</p>
                            {hasTimedOut && <p className={styles.timeoutText}>Quá thời gian chờ chấm điểm. Vui lòng nộp lại.</p>}
                        </div>
                        <Button
                            type="button"
                            variant="primary"
                            disabled={!canManualSubmit}
                            onClick={() => {
                                void submitWriting();
                            }}
                        >
                            {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                        </Button>
                    </div>
                </div>
            </div>

            {isSubmittedCardOpen && (
                <div className={styles.overlay} role="dialog" aria-modal="true">
                    <SubmissionSuccessCard
                        description={"Bạn đã nộp thành công phần Writing.\nVui lòng chuẩn bị cho các phần tiếp theo."}
                        stats={[
                            { label: 'Thời gian hoàn thành', value: `${Math.max(1, Math.round((timeLimitMinutes * 60 - remainingSeconds) / 60))}p` },
                            { label: 'Số từ đã nộp', value: String(wordCount) },
                        ]}
                        continueLabel="Tiếp tục phần Speaking"
                        onContinue={handleContinue}
                    />
                </div>
            )}
        </>
    );
}

export default Writting;