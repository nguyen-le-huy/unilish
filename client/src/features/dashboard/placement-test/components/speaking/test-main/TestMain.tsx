import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Stop from '@/assets/icons/stop.svg';
import Mic from '@/assets/icons/mic.svg';
import { Button } from '@/components/core/Button';
import styles from './TestMain.module.css';
import { useAudioRecorder } from '../../../hooks/use-audio-recorder';
import { useAzureSpeechRecognition } from '../../../hooks/use-azure-speech-recognition';
import { useExaminerTts } from '../../../hooks/use-examiner-tts';
import type { SpeakingCueCard, SpeakingQuestion } from '../../../types/speaking.types';
import type { PronunciationDataPayload } from '../../../types/azure-speech.types';

type TestMainStep = 'intro-part-1' | 'question-1' | 'intro-part-2' | 'cue-card-part-2' | 'intro-part-3' | 'question-3';
const PART1_TIME_LIMIT_SECONDS = 35;
const PART2_THINKING_TIME_SECONDS = 70;
const PART2_SPEAKING_TIME_SECONDS = 120;

type Part2Phase = 'thinking' | 'speaking' | 'finished';

interface SpeakingQuestionData {
    part1Questions: SpeakingQuestion[];
    cueCard: SpeakingCueCard;
    part3Questions: SpeakingQuestion[];
}

interface Props {
    questionData: SpeakingQuestionData;
    onPart1QuestionChange: (questionNumber: number) => void;
    onPart2QuestionChange: (questionNumber: number) => void;
    onPart3QuestionChange: (questionNumber: number) => void;
    onActivePartChange: (partNumber: number) => void;
    onPartComplete: (partNumber: number) => void;
    onUploadChunk: (payload: { 
        part: 1 | 2 | 3; 
        questionIdx: number; 
        audioBlob: Blob;
        pronunciationData?: PronunciationDataPayload;
    }) => Promise<void>;
    onCompleteTest: () => Promise<void>;
}

const TestMain = ({
    questionData,
    onPart1QuestionChange,
    onPart2QuestionChange,
    onPart3QuestionChange,
    onActivePartChange,
    onPartComplete,
    onUploadChunk,
    onCompleteTest,
}: Props) => {
    const [step, setStep] = useState<TestMainStep>('intro-part-1');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [part3QuestionIndex, setPart3QuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(PART1_TIME_LIMIT_SECONDS);
    const [part3TimeLeft, setPart3TimeLeft] = useState(PART1_TIME_LIMIT_SECONDS);
    const [part2Phase, setPart2Phase] = useState<Part2Phase>('thinking');
    const [part2ThinkingTimeLeft, setPart2ThinkingTimeLeft] = useState(PART2_THINKING_TIME_SECONDS);
    const [part2SpeakingTimeLeft, setPart2SpeakingTimeLeft] = useState(PART2_SPEAKING_TIME_SECONDS);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { startRecording, stopRecording, isRecording } = useAudioRecorder();
    const { startRecognition, stopRecognition, isRecognizing } = useAzureSpeechRecognition();
    const { speak, stop, isSpeaking } = useExaminerTts();
    const activeRecordingKeyRef = useRef<string | null>(null);

    const part1Questions = questionData.part1Questions;
    const part3Questions = questionData.part3Questions;
    const cueCard = questionData.cueCard;

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const shouldCaptureAnswer = useMemo(() => {
        if (step === 'question-1') return true;
        if (step === 'question-3') return true;
        if (step === 'cue-card-part-2' && part2Phase === 'speaking') return true;
        return false;
    }, [part2Phase, step]);

    useEffect(() => {
        const playExaminerPrompt = async () => {
            try {
                if (step === 'question-1') {
                    const question = part1Questions[questionIndex];
                    if (question) {
                        await speak(question.text, question.audioKey);
                    }
                }

                if (step === 'cue-card-part-2') {
                    await speak(cueCard.text, cueCard.audioKey);
                }

                if (step === 'question-3') {
                    const question = part3Questions[part3QuestionIndex];
                    if (question) {
                        await speak(question.text, question.audioKey);
                    }
                }
            } catch {
                toast.error('Không thể phát giọng giám khảo. Vui lòng tiếp tục làm bài.');
            }
        };

        void playExaminerPrompt();
    }, [cueCard.audioKey, cueCard.text, part1Questions, part3QuestionIndex, part3Questions, questionIndex, speak, step]);

    useEffect(() => {
        const startAnswerCapture = async () => {
            if (!shouldCaptureAnswer) {
                return;
            }

            const captureKey = `${step}-${questionIndex}-${part3QuestionIndex}-${part2Phase}`;
            if (activeRecordingKeyRef.current === captureKey && isRecording) {
                return;
            }

            activeRecordingKeyRef.current = captureKey;
            
            // Start both audio recording AND Azure pronunciation assessment
            await Promise.all([
                startRecording(),
                startRecognition(),
            ]);
        };

        void startAnswerCapture();
    }, [isRecording, part2Phase, part3QuestionIndex, questionIndex, shouldCaptureAnswer, startRecording, startRecognition, step]);

    const stopAndUploadChunk = async (part: 1 | 2 | 3, idx: number) => {
        // Stop both audio recording AND pronunciation assessment
        const [blob, pronunciationResult] = await Promise.all([
            stopRecording(),
            stopRecognition(),
        ]);
        
        if (!blob) {
            return;
        }

        try {
            await onUploadChunk({
                part,
                questionIdx: idx,
                audioBlob: blob,
                pronunciationData: pronunciationResult as PronunciationDataPayload | undefined,
            });
        } catch {
            toast.error('Không thể gửi dữ liệu âm thanh. Hệ thống sẽ tiếp tục bài thi.');
        }
    };

    const handleStartNow = () => {
        setStep('question-1');
        setQuestionIndex(0);
        setTimeLeft(PART1_TIME_LIMIT_SECONDS);
        onActivePartChange(1);
        onPart1QuestionChange(1);
    };

    const handleNextQuestion = async () => {
        stop();
        await stopAndUploadChunk(1, questionIndex);

        if (questionIndex < part1Questions.length - 1) {
            const nextQuestionIndex = questionIndex + 1;
            setQuestionIndex(nextQuestionIndex);
            setTimeLeft(PART1_TIME_LIMIT_SECONDS);
            onPart1QuestionChange(nextQuestionIndex + 1);
            return;
        }

        onPartComplete(1);
        setStep('intro-part-2');
        onActivePartChange(2);
    };

    const handleNextPart3Question = async () => {
        stop();
        await stopAndUploadChunk(3, part3QuestionIndex);

        if (part3QuestionIndex < part3Questions.length - 1) {
            const nextQuestionIndex = part3QuestionIndex + 1;
            setPart3QuestionIndex(nextQuestionIndex);
            setPart3TimeLeft(PART1_TIME_LIMIT_SECONDS);
            onPart3QuestionChange(nextQuestionIndex + 1);
            return;
        }

        onPartComplete(3);
        setIsSubmitting(true);
        try {
            await onCompleteTest();
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (step !== 'question-1') {
            return;
        }

        if (timeLeft <= 0) {
            void handleNextQuestion();
            return;
        }

        const timerId = window.setInterval(() => {
            setTimeLeft((prevTimeLeft) => Math.max(prevTimeLeft - 1, 0));
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, [step, timeLeft, questionIndex]);

    useEffect(() => {
        if (step !== 'question-3') {
            return;
        }

        if (part3TimeLeft <= 0) {
            void handleNextPart3Question();
            return;
        }

        const timerId = window.setInterval(() => {
            setPart3TimeLeft((prevTimeLeft) => Math.max(prevTimeLeft - 1, 0));
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, [step, part3TimeLeft, part3QuestionIndex]);

    useEffect(() => {
        if (step !== 'cue-card-part-2') {
            return;
        }

        if (part2Phase === 'finished') {
            return;
        }

        const timerId = window.setInterval(() => {
            if (part2Phase === 'thinking') {
                setPart2ThinkingTimeLeft((prevTimeLeft) => {
                    if (prevTimeLeft <= 1) {
                        setPart2Phase('speaking');
                        onPart2QuestionChange(1);
                        return 0;
                    }

                    return prevTimeLeft - 1;
                });

                return;
            }

            setPart2SpeakingTimeLeft((prevTimeLeft) => {
                if (prevTimeLeft <= 1) {
                    void stopAndUploadChunk(2, 0);
                    setPart2Phase('finished');
                    onPartComplete(2);
                    setStep('intro-part-3');
                    onActivePartChange(3);
                    return 0;
                }

                return prevTimeLeft - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, [step, part2Phase, onPart2QuestionChange, onPartComplete]);

    const handleStartPart2 = () => {
        setStep('cue-card-part-2');
        setPart2Phase('thinking');
        setPart2ThinkingTimeLeft(PART2_THINKING_TIME_SECONDS);
        setPart2SpeakingTimeLeft(PART2_SPEAKING_TIME_SECONDS);
        onPart2QuestionChange(0);
    };

    const handleStopPart2Speaking = async () => {
        if (part2Phase !== 'speaking') {
            return;
        }

        stop();
        await stopAndUploadChunk(2, 0);
        setPart2Phase('finished');
        onPartComplete(2);
        setStep('intro-part-3');
        onActivePartChange(3);
    };

    const handleStartPart2SpeakingNow = () => {
        if (part2Phase !== 'thinking') {
            return;
        }

        setPart2Phase('speaking');
        setPart2ThinkingTimeLeft(0);
        onPart2QuestionChange(1);
    };

    const handleStartPart3 = () => {
        setStep('question-3');
        setPart3QuestionIndex(0);
        setPart3TimeLeft(PART1_TIME_LIMIT_SECONDS);
        onActivePartChange(3);
        onPart3QuestionChange(1);
    };

    if (step === 'question-1') {
        return (
            <div className={styles.questionView}>
                <h1 className={styles.questionPartTitle}>Part 1</h1>

                <p className={styles.questionText}>{part1Questions[questionIndex]?.text}</p>

                <div className={styles.timerAura}>
                    <Button
                        type="button"
                        icon={Stop}
                        iconWidth={20}
                        className={styles.timerButton}
                        onClick={() => {
                            void handleNextQuestion();
                        }}
                    >
                        Time limit {formatTime(timeLeft)}   
                    </Button>
                </div>
                <p className={styles.recordingMeta}>{isSpeaking ? 'Giám khảo đang nói...' : (isRecording || isRecognizing) ? 'Đang ghi âm câu trả lời...' : 'Đã tạm dừng ghi âm'}</p>
            </div>
        );
    }

    if (step === 'intro-part-2') {
        return (
            <div className={styles.testMain}>
                <div className={styles.manual}>
                    <h1>Part 2</h1>

                    <div className={styles.content}>
                        <ul className={styles.list}>
                            <li>Part 2 will take about 3 to 4 minutes</li>
                            <li>
                                In this part, you will be given a topic card and you will have 1-2 minutes talk about it.
                            </li>
                            <li>
                                Before you talk, you will have exactly 1 minute to prepare and you can make some notes
                                on the paper provided if you wish
                            </li>
                        </ul>
                    </div>
                </div>

                <Button type="button" onClick={handleStartPart2}>Start now</Button>
            </div>
        );
    }

    if (step === 'cue-card-part-2') {
        const isThinking = part2Phase === 'thinking';
        const timerValue = isThinking
            ? formatTime(part2ThinkingTimeLeft)
            : formatTime(part2SpeakingTimeLeft);

        return (
            <div className={styles.cueCardView}>
                <h1 className={styles.questionPartTitle}>Part 2</h1>

                <div className={styles.cueCardContent}>
                    <p className={styles.cueCardTitle}>{cueCard.text}</p>

                    <p className={styles.cueCardSubtitle}>You should say:</p>

                    <ul className={styles.cueCardList}>
                        {(cueCard.shouldSay ?? []).map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className={styles.cueCardFooter}>
                    {isThinking ? (
                        <>
                            <p className={styles.thinkingTime}>
                                Thinking time remaining <span>{timerValue}</span>
                            </p>

                            <Button
                                type="button"
                                icon={Mic}
                                iconWidth={20}
                                className={styles.recordingHintButton}
                                onClick={handleStartPart2SpeakingNow}
                            >
                                Recording will start after thinking time
                            </Button>
                        </>
                    ) : (
                        <div className={styles.timerAura}>
                            <Button
                                type="button"
                                icon={Stop}
                                iconWidth={20}
                                className={styles.timerButton}
                                onClick={() => {
                                    void handleStopPart2Speaking();
                                }}
                            >
                                Time limit {timerValue}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'question-3') {
        return (
            <div className={styles.questionView}>
                <h1 className={styles.questionPartTitle}>Part 3</h1>

                <p className={styles.questionText}>{part3Questions[part3QuestionIndex]?.text}</p>

                <div className={styles.timerAura}>
                    <Button
                        type="button"
                        icon={Stop}
                        iconWidth={20}
                        className={styles.timerButton}
                        disabled={isSubmitting}
                        onClick={() => {
                            void handleNextPart3Question();
                        }}
                    >
                        {isSubmitting ? 'Đang nộp...' : `Time limit ${formatTime(part3TimeLeft)}`}
                    </Button>
                </div>
                <p className={styles.recordingMeta}>{isSpeaking ? 'Giám khảo đang nói...' : (isRecording || isRecognizing) ? 'Đang ghi âm câu trả lời...' : 'Đã tạm dừng ghi âm'}</p>
            </div>
        );
    }

    if (step === 'intro-part-3') {
        return (
            <div className={styles.testMain}>
                <div className={styles.manual}>
                    <h1>Part 3</h1>

                    <div className={styles.content}>
                        <ul className={styles.list}>
                            <li>Part 3 will take about 4 to 5 minutes</li>
                            <li>
                                In this part, you will discuss some more general questions related to the topic you
                                just speak about.
                            </li>
                        </ul>
                    </div>
                </div>

                <Button type="button" onClick={handleStartPart3}>Start now</Button>
            </div>
        );
    }

    return (
        <div className={styles.testMain}>
            <div className={styles.manual}>
                <h1>Part 1</h1>

                <div className={styles.content}>
                    <ul className={styles.list}>
                        <li>Part 1 will take about 4 to 5 minutes</li>
                        <li>
                            The examiner will ask you some general questions about yourself, your family,
                            your work or studies and familiar topic
                        </li>
                    </ul>
                </div>
            </div>

            <Button type="button" onClick={handleStartNow}>Start now</Button>
        </div>
    );
}

export default TestMain;