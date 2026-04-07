import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import styles from './Speaking.module.css';
import Close from '@/assets/icons/close.svg';
import Done from '@/assets/icons/done.svg';
import { SubmissionSuccessCard } from '@/components/core/SubmissionSuccessCard';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { useAuthStore } from '@/stores/auth.store';
import { usePlacementTestStore } from '@/stores/placement-test.store';
import Intro from '../../components/speaking/intro/Intro';
import TestMain from '../../components/speaking/test-main/TestMain';
import TestMic from '../../components/speaking/test-mic/TestMic';
import { Button } from '@/components/core/Button';
import { startSpeakingAttempt } from '../../api/start-speaking-attempt';
import { uploadAudioChunk } from '../../api/upload-audio-chunk';
import { submitSpeakingAttempt } from '../../api/submit-speaking-attempt';
import type { StartSpeakingAttemptResult } from '../../types/speaking.types';

const partList = [
    { label: 'Part 1', key: 'part1' },
    { label: 'Part 2', key: 'part2' },
    { label: 'Part 3', key: 'part3' },
] as const;

type SpeakingScreen = 'intro' | 'test-mic' | 'test-main';

const Speaking = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const sessionId = usePlacementTestStore((state) => state.sessionId);
    const setCurrentModule = usePlacementTestStore((state) => state.setCurrentModule);
    const setSpeakingAttemptId = usePlacementTestStore((state) => state.setSpeakingAttemptId);

    const [screen, setScreen] = useState<SpeakingScreen>('intro');
    const [currentPart1Question, setCurrentPart1Question] = useState(0);
    const [currentPart2Question, setCurrentPart2Question] = useState(0);
    const [currentPart3Question, setCurrentPart3Question] = useState(0);
    const [activePart, setActivePart] = useState(1);
    const [completedParts, setCompletedParts] = useState<number[]>([]);
    const [isSpeakingSubmitted, setIsSpeakingSubmitted] = useState(false);

    const speakingSessionQuery = useQuery<StartSpeakingAttemptResult, Error>({
        queryKey: ['placement-test', 'speaking', 'start', sessionId],
        queryFn: () => startSpeakingAttempt(String(sessionId)),
        enabled: Boolean(sessionId) && isAuthenticated,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    });

    const uploadChunkMutation = useMutation({
        mutationFn: (payload: { 
            part: 1 | 2 | 3; 
            questionIdx: number; 
            audioBlob: Blob;
            pronunciationData?: Record<string, unknown>;
        }) => {
            return uploadAudioChunk(String(sessionId), {
                speakingAttemptId: String(speakingSessionQuery.data?.speakingAttemptId),
                ...payload,
            });
        },
    });

    const submitSpeakingMutation = useMutation({
        mutationFn: () => {
            return submitSpeakingAttempt(String(sessionId), {
                speakingAttemptId: String(speakingSessionQuery.data?.speakingAttemptId),
            });
        },
    });

    useEffect(() => {
        if (!speakingSessionQuery.data?.speakingAttemptId) {
            return;
        }

        setCurrentModule('speaking');
        setSpeakingAttemptId(speakingSessionQuery.data.speakingAttemptId);
    }, [setCurrentModule, setSpeakingAttemptId, speakingSessionQuery.data?.speakingAttemptId]);

    const questionData = useMemo(() => {
        if (!speakingSessionQuery.data) {
            return null;
        }

        return {
            part1Questions: speakingSessionQuery.data.part1Qs,
            cueCard: speakingSessionQuery.data.cueCard,
            part3Questions: speakingSessionQuery.data.part3Qs,
        };
    }, [speakingSessionQuery.data]);

    const isIntroCompleted = screen === 'test-main';
    const introMicIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="27" viewBox="0 0 20 27" fill="none" aria-hidden="true">
            <path d="M6.96429 15.8092C6.13095 14.9803 5.71429 13.9737 5.71429 12.7895V4.26316C5.71429 3.07895 6.13095 2.07237 6.96429 1.24342C7.79762 0.414474 8.80952 0 10 0C11.1905 0 12.2024 0.414474 13.0357 1.24342C13.869 2.07237 14.2857 3.07895 14.2857 4.26316V12.7895C14.2857 13.9737 13.869 14.9803 13.0357 15.8092C12.2024 16.6382 11.1905 17.0526 10 17.0526C8.80952 17.0526 7.79762 16.6382 6.96429 15.8092ZM8.57143 27V22.6303C6.09524 22.2987 4.04762 21.1974 2.42857 19.3263C0.809524 17.4553 0 15.2763 0 12.7895H2.85714C2.85714 14.7553 3.55381 16.4312 4.94714 17.8172C6.34048 19.2032 8.02476 19.8957 10 19.8947C11.9752 19.8938 13.66 19.2008 15.0543 17.8157C16.4486 16.4307 17.1448 14.7553 17.1429 12.7895H20C20 15.2763 19.1905 17.4553 17.5714 19.3263C15.9524 21.1974 13.9048 22.2987 11.4286 22.6303V27H8.57143Z" fill="#84BC5A" />
        </svg>
    );

    const handleCompleteTest = async () => {
        try {
            await submitSpeakingMutation.mutateAsync();
            setIsSpeakingSubmitted(true);
        } catch {
            toast.error('Không thể nộp bài Speaking. Vui lòng thử lại.');
        }
    };

    const handleContinueAfterSubmit = () => {
        setCurrentModule('result');
        navigate(PATHS.DASHBOARD.PLACEMENT_TEST.RESULT);
    };

    if (!isAuthenticated) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    if (!sessionId) {
        return <Navigate to={PATHS.DASHBOARD.PLACEMENT_TEST.WRITING} replace />;
    }

    if (speakingSessionQuery.isLoading) {
        return <Loading />;
    }

    if (speakingSessionQuery.isError || !questionData) {
        return (
            <div className={styles.errorState} role="alert">
                <p>Không thể khởi tạo phần Speaking. Vui lòng quay lại và thử lại.</p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(PATHS.DASHBOARD.PLACEMENT_TEST.WRITING)}
                >
                    Quay lại phần Writing
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className={styles.speaking}>
                <div className={styles.content}>
                    <div className={styles.header}>
                        <div></div>
                        <h2>Speaking Test</h2>
                        <img src={Close} alt="close" className={styles.closeIcon}/>
                    </div>
                    <div className={styles.body}>
                        {screen === 'intro' ? (
                            <Intro onStart={() => setScreen('test-mic')} />
                        ) : screen === 'test-mic' ? (
                            <TestMic
                                onStartTest={() => {
                                    setScreen('test-main');
                                    setActivePart(1);
                                }}
                            />
                        ) : (
                            <TestMain
                                questionData={questionData}
                                onPart1QuestionChange={setCurrentPart1Question}
                                onPart2QuestionChange={setCurrentPart2Question}
                                onPart3QuestionChange={setCurrentPart3Question}
                                onUploadChunk={async (payload) => {
                                    await uploadChunkMutation.mutateAsync(payload);
                                }}
                                onCompleteTest={handleCompleteTest}
                                onActivePartChange={setActivePart}
                                onPartComplete={(partNumber) => {
                                    setCompletedParts((prevCompletedParts) => (
                                        prevCompletedParts.includes(partNumber)
                                            ? prevCompletedParts
                                            : [...prevCompletedParts, partNumber]
                                    ));
                                }}
                            />
                        )}
                    </div>
                    {!isSpeakingSubmitted && <div className={styles.buttonList}>
                        <Button
                            type="button"
                            variant={isIntroCompleted ? 'primary' : 'outline'}
                            borderColor="var(--green)"
                            textColor={isIntroCompleted ? '#ffffff' : 'var(--green)'}
                            icon={isIntroCompleted ? Done : introMicIcon}
                            iconWidth={25}
                            iconPosition="right"
                            className={`${styles.progressButton} ${isIntroCompleted ? styles.introDoneButton : ''}`.trim()}
                        >
                            Intro
                        </Button>

                        {partList.map((part) => {
                            const partNumber = Number(part.label.replace('Part ', ''));
                            const isCurrentPart = screen === 'test-main' && part.label === `Part ${activePart}`;
                            const isPartCompleted = completedParts.includes(partNumber);
                            const questionCount = part.key === 'part1'
                                ? questionData.part1Questions.length
                                : part.key === 'part2'
                                    ? 1
                                    : questionData.part3Questions.length;

                            const questions = Array.from({ length: questionCount }, (_, idx) => idx + 1);

                            return (
                                <Button
                                    key={part.label}
                                    type="button"
                                    borderColor={isCurrentPart || isPartCompleted ? 'var(--green)' : 'var(--dark-grey)'}
                                    textColor={isPartCompleted ? '#ffffff' : 'var(--dark-grey)'}
                                    className={`${styles.partButton} ${styles.progressButton} ${isCurrentPart ? styles.partButtonActive : ''} ${
                                        isPartCompleted ? styles.partButtonCompleted : ''
                                    }`.trim()}
                                >
                                    <span className={styles.partTitle}>{part.label}</span>

                                    <span className={styles.partQuestionList}>
                                        {questions.map((questionNumber, index) => {
                                            if (isPartCompleted && index === questions.length - 1) {
                                                return (
                                                    <img
                                                        key={questionNumber}
                                                        src={Done}
                                                        alt="completed"
                                                        className={styles.partDoneIcon}
                                                    />
                                                );
                                            }

                                            return (
                                                <span
                                                    key={questionNumber}
                                                    className={`${styles.partQuestionNumber} ${
                                                        isPartCompleted
                                                            ? styles.partQuestionNumberCompleted
                                                            : (
                                                                (part.label === 'Part 1' && questionNumber <= currentPart1Question)
                                                                || (part.label === 'Part 2' && (
                                                                    questionNumber <= currentPart2Question
                                                                    || isCurrentPart
                                                                ))
                                                                || (part.label === 'Part 3' && questionNumber <= currentPart3Question)
                                                            )
                                                                ? styles.partQuestionNumberActive
                                                                : ''
                                                    }`.trim()}
                                                >
                                                    {questionNumber}
                                                </span>
                                            );
                                        })}
                                    </span>
                                </Button>
                            );
                        })}
                    </div>}
                </div>
            </div>
            {isSpeakingSubmitted && (
                <div className={styles.overlay} role="dialog" aria-modal="true">
                    <SubmissionSuccessCard
                        title="Nộp bài speaking thành công"
                        description={"Bạn đã nộp thành công phần Speaking.\nVui lòng ấn tiếp tục để xem kết quả."}
                        stats={[
                            { label: 'Thời gian hoàn thành', value: '15p' },
                            { label: 'Số phần đã hoàn thành', value: '3/3' },
                        ]}
                        continueLabel="Tiếp tục"
                        onContinue={handleContinueAfterSubmit}
                    />
                </div>
            )}
        </>
    );
};

export default Speaking;
