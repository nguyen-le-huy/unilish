import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Brain, Ear, Sparkles, Target } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';

import { useAuthStore } from '@/features/auth';
import { notification } from '@/lib/notification';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useSpeakingContent } from '../../hooks/useSpeakingContent';
import {
    useGenerateSpeakingMission,
    useSaveSpeakingContent,
    useTestSpeakingCoach,
} from '../../hooks/useSpeakingMutations';
import type { LessonSummary } from '../../types/course.types';

import { AzureConfigEditor } from './components/DynamicEditors/AzureConfigEditor';
import { MissionEditor } from './components/DynamicEditors/MissionEditor';
import { OpenAIConfigEditor } from './components/DynamicEditors/OpenAIConfigEditor';
import { SandboxChatPanel } from './components/Sandbox/SandboxChatPanel';
import { SandboxControls } from './components/Sandbox/SandboxControls';
import { SandboxTelemetryPanel } from './components/Sandbox/SandboxTelemetryPanel';
import { useAudioStreaming } from './hooks/use-audio-streaming';
import { useKeywordCoverage } from './hooks/use-keyword-coverage';
import { useSpeakingRealtime } from './hooks/use-speaking-realtime';
import { useSpeechRecognition } from './hooks/use-speech-recognition';
import type {
    AiResponseChunkEvent,
    CoachChatMessage,
    CoachState,
    PhonemeDebugItem,
    SpeakingLessonFormValues,
} from './types/speaking.types';
import { SpeakingLessonFormSchema } from './validations/speaking.validation';

interface Props {
    lesson: LessonSummary;
}

export interface SpeakingStudioRef {
    saveSpeakingContent: () => Promise<void>;
    openTestDrive: () => void;
}

const DEFAULT_FORM_VALUES: SpeakingLessonFormValues = {
    missionTitle: '',
    missionDescription: '',
    aiConfig: {
        roleName: '',
        firstMessage: '',
        systemInstruction: '',
    },
    gradingConfig: {
        referenceText: null,
        gradingSystem: 'FivePoint',
        granularity: 'Phoneme',
        enableProsodyAssessment: true,
        requiredKeywords: [],
        keywordConceptMap: [],
    },
    hints: [],
};

export const SpeakingStudio = forwardRef<SpeakingStudioRef, Props>(function SpeakingStudio(
    { lesson }: Props,
    ref,
) {
    const lessonId = lesson._id;
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);

    const { data: content, isLoading, isError } = useSpeakingContent(lessonId);
    const saveMutation = useSaveSpeakingContent(lessonId);
    const generateMutation = useGenerateSpeakingMission(lessonId);
    const testCoachMutation = useTestSpeakingCoach(lessonId);

    const methods = useForm<SpeakingLessonFormValues>({
        resolver: zodResolver(SpeakingLessonFormSchema),
        defaultValues: DEFAULT_FORM_VALUES,
        mode: 'onChange',
    });

    const {
        reset,
        trigger,
        getValues,
        watch,
        formState: { errors },
    } = methods;

    const [isSandboxOpen, setIsSandboxOpen] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [coachChatMessages, setCoachChatMessages] = useState<CoachChatMessage[]>([]);
    const [isVoiceRealtimeOn, setIsVoiceRealtimeOn] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [lastMicError, setLastMicError] = useState('');
    const [coachState, setCoachState] = useState<CoachState>('Listening');
    const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
    const [lastTokenUsage, setLastTokenUsage] = useState<number | null>(null);
    const [lastModelName, setLastModelName] = useState<string>('—');
    const [lastRequestedModelName, setLastRequestedModelName] = useState<string>('—');
    const [lastTargetLanguage, setLastTargetLanguage] = useState<string>('—');
    const [lastVoiceId, setLastVoiceId] = useState<string>('—');
    const [lastRoleName, setLastRoleName] = useState<string>('—');
    const [lastSessionId, setLastSessionId] = useState<string>('—');
    const [lastUsedFallback, setLastUsedFallback] = useState(false);
    const [latestPhonemeDebug, setLatestPhonemeDebug] = useState<PhonemeDebugItem[]>([]);
    const [rawRealtimeEvents, setRawRealtimeEvents] = useState<{ ts: number; type: string }[]>([]);

    const streamingAssistantMessageIdRef = useRef<string | null>(null);
    const streamingUserMessageIdRef = useRef<string | null>(null);
    const voiceRealtimeRef = useRef(false);

    const missionTitle = watch('missionTitle')?.trim() || lesson.title;
    const hints = watch('hints') || [];
    const requiredKeywords = watch('gradingConfig.requiredKeywords') || [];
    const roleName = watch('aiConfig.roleName') || '';

    const { keywordHitSet, completionRatio } = useKeywordCoverage({
        requiredKeywords,
        messages: coachChatMessages,
    });

    const {
        speakAssistantReply,
        interruptRealtimeAudioPlayback,
        cleanupAudioStreaming,
    } = useAudioStreaming({
        onSpeakingStart: () => setCoachState('Speaking'),
        onSpeakingEnd: () => setCoachState('Listening'),
    });

    const {
        startRealtime,
        stopRealtime,
        cleanup: cleanupSpeakingRealtime,
        sendRealtimeUserMessage,
    } = useSpeakingRealtime();

    const buildPhonemeDebug = (userMessage: string): PhonemeDebugItem[] => {
        if (requiredKeywords.length === 0) return [];

        const normalized = userMessage.toLowerCase();
        return requiredKeywords.map((keyword) => {
            const isHit = normalized.includes(keyword.toLowerCase());

            return {
                word: keyword,
                accuracy: isHit ? 86 : 42,
                issue: isHit ? 'None' : 'MissingKeyword',
            };
        });
    };

    const applyAiChunk = (event: AiResponseChunkEvent) => {
        if (event.textDelta) {
            setCoachChatMessages((prev) => {
                const streamingId = streamingAssistantMessageIdRef.current;
                if (streamingId) {
                    return prev.map((message) => (
                        message.id === streamingId
                            ? { ...message, content: `${message.content}${event.textDelta}` }
                            : message
                    ));
                }

                const newId = crypto.randomUUID();
                streamingAssistantMessageIdRef.current = newId;

                return [
                    ...prev,
                    {
                        id: newId,
                        role: 'assistant',
                        content: event.textDelta,
                        createdAt: Date.now(),
                    },
                ];
            });
        }

        if (event.isFinal) {
            streamingAssistantMessageIdRef.current = null;
        }

        if (event.model) setLastModelName(event.model);
        if (event.requestedModel) setLastRequestedModelName(event.requestedModel);
        if (typeof event.usedFallback === 'boolean') setLastUsedFallback(event.usedFallback);
        if (typeof event.latencyMs === 'number') setLastLatencyMs(event.latencyMs);
        if (typeof event.tokenUsage === 'number') setLastTokenUsage(event.tokenUsage);

    };

    const sendCoachMessage = async (userMessageRaw: string) => {
        const userMessage = userMessageRaw.trim();
        if (!userMessage) return;

        // In realtime socket mode: user message appears via server USER_TRANSCRIPT
        // event, so don't pre-add it here to avoid duplicates.
        if (voiceRealtimeRef.current && user?._id) {
            sendRealtimeUserMessage({ message: userMessage });
            return;
        }

        const nextMessages: CoachChatMessage[] = [
            ...coachChatMessages,
            {
                id: crypto.randomUUID(),
                role: 'user',
                content: userMessage,
                createdAt: Date.now(),
            },
        ];

        setCoachChatMessages(nextMessages);
        setCoachState('Thinking');
        setLatestPhonemeDebug(buildPhonemeDebug(userMessage));

        if (user?._id) {
            const sentRealtime = sendRealtimeUserMessage({ message: userMessage });

            if (sentRealtime) {
                return;
            }
        }

        try {
            const data = await testCoachMutation.mutateAsync({ userMessage });
            setCoachChatMessages([
                ...nextMessages,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: data.reply,
                    createdAt: Date.now(),
                },
            ]);
            setLastLatencyMs(data.latencyMs);
            setLastTokenUsage(data.tokenUsage);
            setLastModelName(data.model);
            setLastRequestedModelName(data.model);
            setLastUsedFallback(false);

            if (voiceRealtimeRef.current) {
                speakAssistantReply(data.reply);
            } else {
                setCoachState('Listening');
            }
        } catch {
            setCoachState('Listening');
            notification.error('Test AI Speech Coach thất bại. Hãy tạo nội dung AI trước.');
        }
    };

    const {
        start: startSpeechRecognition,
        stop: stopSpeechRecognition,
        cleanup: cleanupSpeechRecognition,
        resetNetworkDown,
        isNetworkDown,
        isListening,
    } = useSpeechRecognition({
        onFinalTranscript: (transcript) => {
            // When realtime socket is active the server's Whisper handles
            // transcription and emits USER_TRANSCRIPT; browser SpeechRecognition
            // is only used for live interim visual feedback in that mode.
            if (voiceRealtimeRef.current) return;
            void sendCoachMessage(transcript);
        },
        onInterimTranscript: (value) => {
            setLiveTranscript(value);
        },
        onPermissionDenied: () => {
            setLastMicError('Bạn chưa cấp quyền microphone cho trình duyệt.');
            notification.error('Bạn chưa cấp quyền microphone cho trình duyệt.');
            voiceRealtimeRef.current = false;
            setIsVoiceRealtimeOn(false);
            stopRealtime({
                userId: user?._id,
                lessonId,
                reason: 'error',
            });
        },
        onAudioCaptureError: () => {
            setLastMicError('Không tìm thấy microphone khả dụng trên thiết bị.');
            notification.error('Không tìm thấy microphone khả dụng trên thiết bị.');
            voiceRealtimeRef.current = false;
            setIsVoiceRealtimeOn(false);
            stopRealtime({
                userId: user?._id,
                lessonId,
                reason: 'error',
            });
        },
        onSoftError: (message) => {
            setLastMicError(message);
            notification.warning(message);
        },
    });

    const handleGenerateByAi = () => {
        const values = getValues();
        const topic = values.missionTitle?.trim() || lesson.title;
        const context = values.missionDescription?.trim() || `Create a practical speaking mission for lesson: ${lesson.title}`;

        generateMutation.mutate(
            { topic, context },
            {
                onSuccess: (data) => {
                    reset(
                        {
                            missionTitle: data.missionTitle || '',
                            missionDescription: data.missionDescription || '',
                            aiConfig: data.aiConfig || DEFAULT_FORM_VALUES.aiConfig,
                            gradingConfig: data.gradingConfig || DEFAULT_FORM_VALUES.gradingConfig,
                            hints: data.hints || [],
                        },
                        { keepDirtyValues: false },
                    );
                    notification.success('Đã tạo nội dung Speaking bằng AI.');
                },
                onError: () => {
                    notification.error('Không thể tạo nội dung Speaking bằng AI.');
                },
            },
        );
    };

    const handleSendCoachMessage = async () => {
        await sendCoachMessage(chatInput);
        setChatInput('');
    };

    const stopVoiceRealtime = () => {
        voiceRealtimeRef.current = false;
        setIsVoiceRealtimeOn(false);

        stopSpeechRecognition();
        stopRealtime({
            userId: user?._id,
            lessonId,
            reason: 'user_initiated',
        });

        void interruptRealtimeAudioPlayback();
        setLiveTranscript('');
    };

    const toggleVoiceRealtime = () => {
        if (isVoiceRealtimeOn) {
            stopVoiceRealtime();
            notification.info('Đã tắt realtime voice test.');
            return;
        }

        if (!token || !user?._id) {
            notification.error('Bạn cần đăng nhập lại để dùng realtime speech socket.');
            return;
        }

        setLastMicError('');
        resetNetworkDown();
        setRawRealtimeEvents([]);
        voiceRealtimeRef.current = true;
        setIsVoiceRealtimeOn(true);

        void (async () => {
            const realtimeReady = await startRealtime({
                token,
                userId: user._id,
                lessonId,
                onSessionStarted: (event) => {
                    if (event.targetLanguage?.trim()) setLastTargetLanguage(event.targetLanguage);
                    if (event.voiceId?.trim()) setLastVoiceId(event.voiceId);
                    if (event.roleName?.trim()) setLastRoleName(event.roleName);
                    if (event.sessionId?.trim()) setLastSessionId(event.sessionId);
                    if (event.realtimeModel?.trim()) {
                        setLastRequestedModelName(event.realtimeModel);
                    }
                    setCoachState('Listening');
                },
                onAiResponseChunk: applyAiChunk,
                onTranscriptDelta: (event) => {
                    if (!event.delta) return;

                    const normalizedText = event.delta.trim();
                    if (!normalizedText) return;

                    if (!event.isFinal) {
                        if (event.role === 'assistant') {
                            setCoachState('Speaking');
                        }
                        return;
                    }

                    if (event.role === 'assistant') {
                        streamingAssistantMessageIdRef.current = null;
                    } else {
                        streamingUserMessageIdRef.current = null;
                    }

                    setCoachChatMessages((prev) => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: event.role,
                            content: normalizedText,
                            createdAt: Date.now(),
                        },
                    ]);
                },
                onSessionEnded: () => {
                    voiceRealtimeRef.current = false;
                    setIsVoiceRealtimeOn(false);
                },
                onSessionError: (event) => {
                    setLastMicError(event.message);
                    setCoachState('Listening');
                    setCoachChatMessages((prev) => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: `⚠️ ${event.message}`,
                            createdAt: Date.now(),
                        },
                    ]);
                    notification.warning(event.message);
                },
                onConnectError: (message) => {
                    setLastMicError(message || 'Không thể kết nối OpenAI Realtime.');
                },
                onRawEvent: (type) => {
                    setRawRealtimeEvents((prev) => [
                        ...prev.slice(-29),
                        { ts: Date.now(), type },
                    ]);
                },
            });

            if (!realtimeReady) {
                voiceRealtimeRef.current = false;
                setIsVoiceRealtimeOn(false);
                notification.warning('Không thể bật OpenAI Realtime trên trình duyệt hiện tại.');
                return;
            }

            const speechRecognitionReady = startSpeechRecognition();

            if (!speechRecognitionReady) {
                if (isNetworkDown()) {
                    notification.info('Realtime vẫn hoạt động, nhưng live transcript đang tạm tắt do lỗi mạng Web Speech.');
                } else {
                    notification.info('Realtime vẫn hoạt động nhưng không có live transcript vì trình duyệt không hỗ trợ SpeechRecognition.');
                }
            }

            notification.success('Đã bật realtime voice test. Hãy nói bằng tiếng Anh.');
        })();
    };

    const forceInterrupt = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        void interruptRealtimeAudioPlayback();
        setCoachState('Listening');
    };

    useEffect(() => {
        if (!content) return;

        reset(
            {
                missionTitle: content.missionTitle || '',
                missionDescription: content.missionDescription || '',
                aiConfig: content.aiConfig || DEFAULT_FORM_VALUES.aiConfig,
                gradingConfig: content.gradingConfig || DEFAULT_FORM_VALUES.gradingConfig,
                hints: content.hints || [],
            },
            { keepDirtyValues: false },
        );
    }, [content, reset]);

    useEffect(() => {
        return () => {
            cleanupSpeechRecognition();
            cleanupSpeakingRealtime();
            cleanupAudioStreaming();
        };
    }, [cleanupAudioStreaming, cleanupSpeakingRealtime, cleanupSpeechRecognition]);

    useImperativeHandle(ref, () => ({
        saveSpeakingContent: async () => {
            const isValid = await trigger();
            if (isValid) {
                const values = getValues();
                await saveMutation.mutateAsync(values);
            } else {
                throw new Error('Speaking validation failed');
            }
        },
        openTestDrive: () => {
            setIsSandboxOpen(true);
        },
    }));

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center p-4">
                <Skeleton className="h-full w-full" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex py-10 items-center justify-center text-center text-sm text-muted-foreground border-dashed border-2 rounded">
                <div className="space-y-2">
                    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/60" aria-hidden="true" />
                    <p>Không tải được cấu hình Speaking.</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <Tabs defaultValue="mission" className="w-full">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="mission" className="gap-2">
                            <Target className="h-4 w-4" />
                            Nhiệm vụ & Gợi ý
                            {(errors.missionTitle || errors.missionDescription || errors.hints) && (
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-1" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="openai" className="gap-2">
                            <Brain className="h-4 w-4" />
                            Cấu hình AI Đóng vai
                            {errors.aiConfig && (
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-1" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="azure" className="gap-2">
                            <Ear className="h-4 w-4" />
                            Tiêu chí chấm điểm
                            {errors.gradingConfig && (
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-1" />
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            onClick={handleGenerateByAi}
                            disabled={generateMutation.isPending}
                            className="gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            {generateMutation.isPending ? 'AI đang tạo...' : 'Tạo nội dung AI'}
                        </Button>
                    </div>
                </div>

                <div className="mt-4 border rounded-xl bg-slate-50/50 p-6">
                    <TabsContent value="mission" className="mt-0">
                        <MissionEditor />
                    </TabsContent>
                    <TabsContent value="openai" className="mt-0">
                        <OpenAIConfigEditor />
                    </TabsContent>
                    <TabsContent value="azure" className="mt-0">
                        <AzureConfigEditor />
                    </TabsContent>
                </div>
            </Tabs>

            <Dialog
                open={isSandboxOpen}
                onOpenChange={(open) => {
                    if (!open && isVoiceRealtimeOn) {
                        stopVoiceRealtime();
                    }
                    setIsSandboxOpen(open);
                }}
            >
                <DialogContent className="flex h-[100vh] max-h-[100vh] w-screen max-w-none flex-col overflow-hidden rounded-none p-0">
                    <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
                        <DialogTitle>Simulation Studio — Test Speaking Coach</DialogTitle>
                        <DialogDescription>
                            Môi trường giả lập để kiểm thử realtime trước khi xuất bản.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid min-h-0 flex-1 grid-cols-2 divide-x overflow-hidden">
                        <div className="grid min-h-0 h-full grid-rows-[1fr_auto] overflow-hidden">
                            <SandboxChatPanel
                                missionTitle={missionTitle}
                                messages={coachChatMessages}
                                liveTranscript={liveTranscript}
                            />
                            <SandboxControls
                                isVoiceRealtimeOn={isVoiceRealtimeOn}
                                isListening={isListening}
                                lastMicError={lastMicError}
                                chatInput={chatInput}
                                showHints={showHints}
                                hints={hints}
                                isSendingDisabled={testCoachMutation.isPending || !chatInput.trim()}
                                onChatInputChange={setChatInput}
                                onSendMessage={() => void handleSendCoachMessage()}
                                onToggleVoiceRealtime={toggleVoiceRealtime}
                                onToggleHints={() => setShowHints((prev) => !prev)}
                            />
                        </div>

                        <div className="min-h-0 h-full overflow-hidden">
                            <SandboxTelemetryPanel
                                lastRequestedModelName={lastRequestedModelName}
                                lastModelName={lastModelName}
                                targetLanguage={lastTargetLanguage}
                                voiceId={lastVoiceId}
                                roleName={lastRoleName}
                                sessionId={lastSessionId}
                                lastUsedFallback={lastUsedFallback}
                                lastLatencyMs={lastLatencyMs}
                                lastTokenUsage={lastTokenUsage}
                                coachState={coachState}
                                rawRealtimeEvents={rawRealtimeEvents}
                                onForceInterrupt={forceInterrupt}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </FormProvider>
    );
});
