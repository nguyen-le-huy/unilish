import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { notification } from '@/lib/notification';
import { useListeningContent } from '../../hooks/useListeningContent';
import {
    useSaveListeningContent,
    useGenerateListeningScript,
    useMixAndSync,
    useCancelMixAndSync,
    useListeningSyncStatus,
} from '../../hooks/useListeningMutations';
import { useListeningStudioState } from './hooks/useListeningStudioState';
import { ListeningTopBar } from './components/ListeningTopBar/ListeningTopBar';
import { ListeningNavigator } from './components/ListeningNavigator/ListeningNavigator';
import { ScriptEditor } from './components/ScriptEditor/ScriptEditor';
import { KaraokeSyncEditor } from './components/KaraokeSyncEditor/KaraokeSyncEditor';
import { AiPipelineOverlay } from './components/AiPipelineOverlay/AiPipelineOverlay';
import type {
    LessonSummary,
    ListeningLessonFormValues,
    CEFRLevel,
    ListeningScriptFormat,
} from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lesson: LessonSummary;
    courseLevel: CEFRLevel;
}

// ─── Default form values ──────────────────────────────────────────────────────

const DEFAULT_FORM_VALUES: ListeningLessonFormValues = {
    media: {
        audioUrl: null,
        duration: 0,
        accent: 'en-US',
        noiseLevel: 'none',
        speed: 1,
    },
    transcript: [],
    interactiveConfig: {
        mode: 'GAP_FILL',
        hidePercentage: 30,
        allowSlowSpeed: true,
    },
    practiceConfig: {
        mode: 'FIXED',
        passingScore: 70,
    },
};

// ─── Helpers: derive pipeline step and progress from generation status ─────────

function derivePipelineStep(status: string): { step: 1 | 2 | 3; progress: number } {
    switch (status) {
        case 'GENERATING_SCRIPT':
            return { step: 1, progress: 15 };
        case 'GENERATING_AUDIO':
            return { step: 2, progress: 50 };
        case 'SYNCING':
            return { step: 3, progress: 80 };
        default:
            return { step: 1, progress: 0 };
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ListeningStudio = memo(function ListeningStudio({ lesson, courseLevel }: Props) {
    const lessonId = lesson._id;
    const [desiredScriptPrompt, setDesiredScriptPrompt] = useState('');
    const [scriptFormat, setScriptFormat] = useState<ListeningScriptFormat>('DIALOGUE');

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: content, isLoading, isError } = useListeningContent(lessonId);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const saveMutation = useSaveListeningContent(lessonId);
    const generateScriptMutation = useGenerateListeningScript(lessonId);
    const mixAndSyncMutation = useMixAndSync(lessonId);
    const cancelMixAndSyncMutation = useCancelMixAndSync(lessonId);

    // Sync-status polling — starts after Mix & Sync is triggered
    const generationStatus = content?.generationStatus ?? 'IDLE';
    const initialProcessing = ['GENERATING_SCRIPT', 'GENERATING_AUDIO', 'SYNCING'].includes(generationStatus);

    const syncStatusQuery = useListeningSyncStatus(lessonId, initialProcessing);
    const effectiveGenerationStatus = syncStatusQuery.data?.status ?? generationStatus;
    const isProcessing = ['GENERATING_SCRIPT', 'GENERATING_AUDIO', 'SYNCING'].includes(effectiveGenerationStatus);

    // ── UI state ──────────────────────────────────────────────────────────────
    const {
        activeSection,
        setActiveSection,
        isAiSyncOverlayOpen,
        openAiSyncOverlay,
        closeAiSyncOverlay,
    } = useListeningStudioState();

    // ── Form ──────────────────────────────────────────────────────────────────
    const methods = useForm<ListeningLessonFormValues>({
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const { reset, handleSubmit } = methods;

    const transcript = methods.watch('transcript');
    const audioUrl = methods.watch('media.audioUrl');


    const hasScriptError = useMemo(() => {
        if (!audioUrl) return true;
        if (!transcript || transcript.length === 0) return true;
        return transcript.some((line) => !line.text?.trim() || !line.speaker?.trim() || !line.role?.trim());
    }, [audioUrl, transcript]);

    const hasKaraokeError = useMemo(() => {
        if (!audioUrl) return true;
        if (!transcript || transcript.length === 0) return true;
        return transcript.some((line) => !line.words || line.words.length === 0);
    }, [audioUrl, transcript]);

    const wasProcessingRef = useRef(false);

    // ── Seed form when data loads ─────────────────────────────────────────────
    useEffect(() => {
        if (!content) return;

        reset(
            {
                media: content.media,
                transcript: content.transcript,
                interactiveConfig: content.interactiveConfig,
                practiceConfig: {
                    mode: content.practiceConfig.mode,
                    passingScore: content.practiceConfig.passingScore,
                },
            },
            { keepDirtyValues: false },
        );
    }, [content, reset]);

    // ── Open overlay when pipeline starts ────────────────────────────────────
    useEffect(() => {
        if (isProcessing) {
            openAiSyncOverlay();
        } else {
            // Close for DONE, ERROR, or IDLE (cancelled)
            closeAiSyncOverlay();
            const shouldNotify = wasProcessingRef.current;
            if (shouldNotify && effectiveGenerationStatus === 'DONE') {
                notification.success('Pipeline hoàn thành! Audio và sync đã sẵn sàng.');
            } else if (shouldNotify && effectiveGenerationStatus === 'ERROR') {
                notification.error('Pipeline thất bại. Vui lòng thử lại.');
            }
            // IDLE = cancelled or initial state — no notification needed
        }

        wasProcessingRef.current = isProcessing;
    }, [isProcessing, effectiveGenerationStatus, openAiSyncOverlay, closeAiSyncOverlay]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const derived = derivePipelineStep(effectiveGenerationStatus);
    const step = derived.step;
    const progress = syncStatusQuery.data?.progress ?? derived.progress;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSave = handleSubmit((formValues: ListeningLessonFormValues) => {
        saveMutation.mutate(
            {
                media: formValues.media,
                transcript: formValues.transcript,
                interactiveConfig: formValues.interactiveConfig,
                practiceConfig: {
                    mode: formValues.practiceConfig.mode,
                    passingScore: formValues.practiceConfig.passingScore,
                },
            },
            {
                onSuccess: () => notification.success('Đã lưu nội dung bài nghe'),
                onError: () => notification.error('Lỗi khi lưu nội dung'),
            },
        );
    });

    const handleGenerateScript = useCallback(() => {
        generateScriptMutation.mutate(
            {
                topic: desiredScriptPrompt.trim() || (lesson.title + " (" + courseLevel + ")"),
                scriptFormat,
            },
            {
                onSuccess: (data) => {
                    notification.success(`Đã tạo kịch bản ${data.length} dòng thoại!`);
                    setActiveSection('script');
                },
                onError: (err) => notification.error(`Lỗi khi tạo kịch bản: ${err.message}`),
            },
        );
    }, [courseLevel, desiredScriptPrompt, generateScriptMutation, lesson.title, scriptFormat, setActiveSection]);

    const handleMixAndSync = handleSubmit(async (formValues: ListeningLessonFormValues) => {
        try {
            await saveMutation.mutateAsync({
                media: formValues.media,
                transcript: formValues.transcript,
                interactiveConfig: formValues.interactiveConfig,
                practiceConfig: {
                    mode: formValues.practiceConfig.mode,
                    passingScore: formValues.practiceConfig.passingScore,
                },
            });

            await mixAndSyncMutation.mutateAsync({});
            notification.success('Đã gửi yêu cầu Mix & Sync…');
        } catch {
            notification.error('Lỗi khi gửi yêu cầu Mix & Sync');
        }
    });

    const handleCancelMixAndSync = useCallback(() => {
        cancelMixAndSyncMutation.mutate(undefined, {
            onSuccess: () => notification.success('Đã huỷ pipeline.'),
            onError: () => notification.error('Không thể huỷ. Vui lòng thử lại.'),
        });
    }, [cancelMixAndSyncMutation]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex h-full flex-col gap-3 p-4">
                <Skeleton className="h-10 w-full" />
                <div className="flex flex-1 gap-3">
                    <Skeleton className="h-full w-1/4" />
                    <Skeleton className="h-full flex-1" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <div className="space-y-2">
                    <AlertTriangle
                        className="mx-auto h-8 w-8 text-destructive/60"
                        aria-hidden="true"
                    />
                    <p>Không tải được nội dung bài nghe.</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            {/* Outer flex column */}
            <div className="flex h-full flex-col overflow-hidden">
                {/* Top Bar */}
                <ListeningTopBar
                    lessonTitle={lesson.title}
                    isSaving={saveMutation.isPending}
                    isGeneratingScript={generateScriptMutation.isPending}
                    isSyncing={mixAndSyncMutation.isPending || isProcessing}
                    syncStatus={effectiveGenerationStatus}
                    syncProgress={progress}
                    onSave={handleSave}
                    onGenerateScript={handleGenerateScript}
                    onMixAndSync={handleMixAndSync}
                />

                {/* Split Pane: Navigator | Editor */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Section Navigator — 25% */}
                    <div className="w-1/4 overflow-hidden">
                        <ListeningNavigator
                            activeSection={activeSection}
                            onSectionChange={setActiveSection}
                            hasScriptError={hasScriptError}
                            hasKaraokeError={hasKaraokeError}
                        />
                    </div>

                    {/* Right: Dynamic Content Editor — 75% */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeSection === 'script' && (
                            <ScriptEditor
                                desiredPrompt={desiredScriptPrompt}
                                scriptFormat={scriptFormat}
                                onDesiredPromptChange={setDesiredScriptPrompt}
                                onScriptFormatChange={setScriptFormat}
                            />
                        )}

                        {activeSection === 'karaoke' && <KaraokeSyncEditor />}

                    </div>
                </div>
            </div>

            {/* AI Pipeline Progress Overlay */}
            <AiPipelineOverlay
                isVisible={isAiSyncOverlayOpen}
                progress={progress}
                step={step}
                isCancelling={cancelMixAndSyncMutation.isPending}
                onCancel={handleCancelMixAndSync}
            />

        </FormProvider>
    );
});
