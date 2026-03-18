import { useCallback, useMemo, useRef, useState } from 'react';
import { notification } from '@/lib/notification';
import type { CoachChatMessage, GradingConfig } from '../types/speaking.types';
import type { PronunciationResult, PttStatus, TurnResult } from '../types/pipeline.types';
import { usePttRecorder } from './use-ptt-recorder';
import { useOpenAiPipeline } from './use-openai-pipeline';
import { useAzurePronunciation } from './use-azure-pronunciation';

interface UseCoachSessionParams {
    lessonId: string;
    greeting: string;
    gradingConfig: GradingConfig;
}

interface CoachTelemetry {
    latencyMs: number | null;
    tokenUsage: number | null;
    model: string;
    requestedModel: string;
    usedFallback: boolean;
    recognizedText: string;
    referenceText: string;
}

export interface UserTurnScore {
    id: string;
    createdAt: number;
    userText: string;
    referenceText: string;
    pronunciation: PronunciationResult | null;
    error: string | null;
}

interface UseCoachSessionReturn {
    pttStatus: PttStatus;
    chatMessages: CoachChatMessage[];
    turnResult: TurnResult;
    turnScores: UserTurnScore[];
    telemetry: CoachTelemetry;
    startSession: () => Promise<void>;
    handleToggleMic: () => Promise<void>;
    resetSession: () => void;
    interrupt: () => void;
}

const buildPronunciationContext = (pronunciation: PronunciationResult | null): string | undefined => {
    if (!pronunciation || pronunciation.words.length === 0) {
        return undefined;
    }

    const weakWords = pronunciation.words
        .filter((word) => word.accuracyScore < 70)
        .slice(0, 3)
        .map((word) => {
            const weakPhonemes = word.phonemes
                .filter((phoneme) => phoneme.accuracyScore < 70)
                .slice(0, 3)
                .map((phoneme) => `${phoneme.phoneme} (${phoneme.accuracyScore})`)
                .join(', ');

            return weakPhonemes
                ? `${word.word}: ${weakPhonemes}`
                : `${word.word}: accuracy ${word.accuracyScore}`;
        });

    if (weakWords.length === 0) {
        return undefined;
    }

    return `Learner pronunciation difficulties: ${weakWords.join(' | ')}`;
};

const initialTurnResult: TurnResult = {
    stt: null,
    llm: null,
    pronunciation: null,
    error: null,
};

export const useCoachSession = ({
    lessonId,
    greeting,
    gradingConfig,
}: UseCoachSessionParams): UseCoachSessionReturn => {
    const [pttStatus, setPttStatus] = useState<PttStatus>('idle');
    const [chatMessages, setChatMessages] = useState<CoachChatMessage[]>([]);
    const [turnResult, setTurnResult] = useState<TurnResult>(initialTurnResult);
    const [turnScores, setTurnScores] = useState<UserTurnScore[]>([]);
    const [telemetry, setTelemetry] = useState<CoachTelemetry>({
        latencyMs: null,
        tokenUsage: null,
        model: '—',
        requestedModel: '—',
        usedFallback: false,
        recognizedText: '—',
        referenceText: '—',
    });

    const recorder = usePttRecorder();
    const openAiPipeline = useOpenAiPipeline();
    const azure = useAzurePronunciation();

    // Ref to avoid stale closures inside processTurn
    const turnResultRef = useRef<TurnResult>(initialTurnResult);
    const isProcessingRef = useRef(false);

    const historyForModel = useMemo(() => {
        return chatMessages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .map((message) => ({ role: message.role, content: message.content }));
    }, [chatMessages]);

    const startSession = useCallback(async () => {
        // Unlock browser audio autoplay policy synchronously
        openAiPipeline.unlockAudio();

        const greetingText = greeting.trim();
        if (!greetingText) {
            return;
        }

        if (chatMessages.length > 0) {
            return;
        }

        const greetingMessageId = crypto.randomUUID();
        setChatMessages([
            {
                id: greetingMessageId,
                role: 'assistant',
                content: greetingText,
                createdAt: Date.now(),
            },
        ]);

        try {
            setPttStatus('ai_speaking');
            await openAiPipeline.playDirectly(lessonId, greetingText);
        } catch {
            notification.warning('Không thể phát lời chào bằng giọng nói, nhưng bạn vẫn có thể luyện tập.');
        } finally {
            setPttStatus('idle');
        }
    }, [chatMessages.length, greeting, lessonId, openAiPipeline]);

    const processTurn = useCallback(async (audioBlob: Blob) => {
        // Guard: prevent concurrent turn processing
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;
        setPttStatus('processing');

        const freshTurnResult = initialTurnResult;
        turnResultRef.current = freshTurnResult;
        setTurnResult(freshTurnResult);

        try {
            const stt = await openAiPipeline.transcribe(lessonId, audioBlob);

            setTurnResult((prev) => ({ ...prev, stt }));
            setChatMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: stt.transcript,
                    createdAt: Date.now(),
                },
            ]);

            const referenceText = gradingConfig.referenceText?.trim() || stt.transcript;
            const turnId = crypto.randomUUID();

            setTurnScores((prev) => [
                ...prev,
                {
                    id: turnId,
                    createdAt: Date.now(),
                    userText: stt.transcript,
                    referenceText,
                    pronunciation: null,
                    error: null,
                },
            ]);

            // Read from ref to avoid stale closure on previous turn's pronunciation
            const previousPronunciationContext = buildPronunciationContext(
                turnResultRef.current.pronunciation,
            );

            void azure.assess(audioBlob, referenceText)
                .then((pronunciation) => {
                    if (!pronunciation) {
                        setTurnScores((prev) => prev.map((item) => {
                            if (item.id !== turnId) {
                                return item;
                            }
                            return {
                                ...item,
                                error: 'Azure không trả về kết quả cho lượt này.',
                            };
                        }));
                        return;
                    }

                    setTurnResult((prev) => {
                        const updated = { ...prev, pronunciation };
                        turnResultRef.current = updated;
                        return updated;
                    });
                    setTelemetry((prev) => ({
                        ...prev,
                        recognizedText: pronunciation.recognizedText || '—',
                        referenceText,
                    }));

                    setTurnScores((prev) => prev.map((item) => {
                        if (item.id !== turnId) {
                            return item;
                        }
                        return {
                            ...item,
                            pronunciation,
                            error: null,
                        };
                    }));
                })
                .catch(() => {
                    setTurnScores((prev) => prev.map((item) => {
                        if (item.id !== turnId) {
                            return item;
                        }
                        return {
                            ...item,
                            error: 'Azure bị timeout hoặc lỗi kết nối.',
                        };
                    }));
                });

            const assistantMessageId = crypto.randomUUID();
            setChatMessages((prev) => [
                ...prev,
                {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    createdAt: Date.now(),
                },
            ]);

            // 3. Đợi AI response và nhận event audio
            const llm = await openAiPipeline.streamReply({
                lessonId,
                transcript: stt.transcript,
                chatHistory: historyForModel,
                pronunciationContext: previousPronunciationContext,
                onChunk: (chunk) => {
                    setChatMessages((prev) => prev.map((message) => {
                        if (message.id !== assistantMessageId) return message;
                        return {
                            ...message,
                            content: `${message.content}${chunk}`,
                        };
                    }));
                },
                onAudioStart: () => {
                    // Chuyển sang UI AI Speaking khi file âm thanh đầu tiên bắt đầu phát
                    setPttStatus('ai_speaking');
                },
            });

            // Fallback nếu model kiên quyết không nhả ra chữ nào (blank response)
            if (!llm.reply.trim()) {
                const fallbackReply = 'Thank you, I have no more questions. You may proceed.';
                llm.reply = fallbackReply;
                setChatMessages((prev) => prev.map((message) => {
                    if (message.id !== assistantMessageId) return message;
                    return {
                        ...message,
                        content: fallbackReply,
                    };
                }));
                // Bắt đầu phát TTS thủ công vì onChunk không bao giờ chạy
                setPttStatus('ai_speaking');
                await openAiPipeline.playDirectly(lessonId, fallbackReply);
            }

            setTurnResult((prev) => {
                const updated = { ...prev, llm };
                turnResultRef.current = updated;
                return updated;
            });
            setTelemetry((prev) => ({
                ...prev,
                latencyMs: llm.latencyMs,
                tokenUsage: llm.tokenUsage,
                model: llm.model || '—',
                requestedModel: llm.requestedModel || '—',
                usedFallback: llm.usedFallback,
            }));

            // Đợi tất cả câu LLM nói xong được phát ra loa.
            // Có thể AI đã nói xong 1 nửa rồi vì chạy đồng thời, hàm này chỉ chặn đến khi queue rỗng.
            await openAiPipeline.waitForAudio();

            setPttStatus('idle');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Có lỗi khi xử lý lượt nói.';
            const errResult = { ...turnResultRef.current, error: message };
            turnResultRef.current = errResult;
            setTurnResult(errResult);
            setPttStatus('error');
            notification.error(message);
        } finally {
            isProcessingRef.current = false;
        }
    }, [azure, gradingConfig.referenceText, historyForModel, lessonId, openAiPipeline]);

    const handleToggleMic = useCallback(async () => {
        if (pttStatus === 'processing' || pttStatus === 'ai_speaking') {
            return;
        }

        if (pttStatus === 'idle' || pttStatus === 'error') {
            const started = await recorder.startRecording();
            if (started) {
                setPttStatus('recording');
            }
            return;
        }

        if (pttStatus === 'recording') {
            const recordResult = await recorder.stopRecording();
            if (!recordResult) {
                setPttStatus('idle');
                return;
            }
            await processTurn(recordResult.blob);
        }
    }, [processTurn, pttStatus, recorder]);

    const resetSession = useCallback(() => {
        recorder.reset();
        openAiPipeline.interrupt();

        setPttStatus('idle');
        setTurnResult(initialTurnResult);
        setTurnScores([]);
        setTelemetry({
            latencyMs: null,
            tokenUsage: null,
            model: '—',
            requestedModel: '—',
            usedFallback: false,
            recognizedText: '—',
            referenceText: '—',
        });
        setChatMessages([]);
    }, [openAiPipeline, recorder]);

    const interrupt = useCallback(() => {
        openAiPipeline.interrupt();
        if (pttStatus === 'ai_speaking') {
            setPttStatus('idle');
        }
    }, [openAiPipeline, pttStatus]);

    return {
        pttStatus,
        chatMessages,
        turnResult,
        turnScores,
        telemetry,
        startSession,
        handleToggleMic,
        resetSession,
        interrupt,
    };
};
