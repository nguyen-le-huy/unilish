import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Brain, Ear, Sparkles, Target } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';

import { notification } from '@/lib/notification';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useSpeakingContent } from '../../hooks/useSpeakingContent';
import {
    useGenerateSpeakingMission,
    useSaveSpeakingContent,
} from '../../hooks/useSpeakingMutations';
import type { LessonSummary } from '../../types/course.types';

import { AzureConfigEditor } from './components/DynamicEditors/AzureConfigEditor';
import { MissionEditor } from './components/DynamicEditors/MissionEditor';
import { OpenAIConfigEditor } from './components/DynamicEditors/OpenAIConfigEditor';
import { SandboxChatPanel } from './components/Sandbox/SandboxChatPanel';
import { SandboxControls } from './components/Sandbox/SandboxControls';
import { SandboxTelemetryPanel } from './components/Sandbox/SandboxTelemetryPanel';
import { useCoachSession } from './hooks/use-coach-session';
import type { SpeakingLessonFormValues } from './types/speaking.types';
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

    const { data: content, isLoading, isError } = useSpeakingContent(lessonId);
    const saveMutation = useSaveSpeakingContent(lessonId);
    const generateMutation = useGenerateSpeakingMission(lessonId);

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

    const missionTitle = watch('missionTitle')?.trim() || lesson.title;
    const hints = watch('hints') || [];
    const gradingConfig = watch('gradingConfig') || DEFAULT_FORM_VALUES.gradingConfig;
    const greeting = watch('aiConfig.firstMessage')?.trim() || 'Hello! Let us begin.';

    const {
        pttStatus,
        chatMessages,
        turnResult,
        turnScores,
        telemetry,
        startSession,
        handleToggleMic,
        resetSession,
        interrupt,
    } = useCoachSession({
        lessonId,
        greeting,
        gradingConfig,
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
            void startSession();
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
                    if (!open) {
                        resetSession();
                    }
                    setIsSandboxOpen(open);
                }}
            >
                <DialogContent className="flex h-[100vh] max-h-[100vh] w-screen max-w-none flex-col overflow-hidden rounded-none p-0">
                    <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
                        <DialogTitle>Simulation Studio — Test Speaking Coach</DialogTitle>
                        <DialogDescription>
                            Môi trường giả lập PTT để kiểm thử STT → LLM → TTS và Azure Pronunciation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid min-h-0 flex-1 grid-cols-2 divide-x overflow-hidden">
                        <div className="grid min-h-0 h-full grid-rows-[1fr_auto] overflow-hidden">
                            <SandboxChatPanel
                                missionTitle={missionTitle}
                                messages={chatMessages}
                            />
                            <SandboxControls
                                pttStatus={pttStatus}
                                turnResult={turnResult}
                                showHints={showHints}
                                hints={hints}
                                onToggleMic={() => void handleToggleMic()}
                                onToggleHints={() => setShowHints((prev) => !prev)}
                                onResetSession={resetSession}
                            />
                        </div>

                        <div className="min-h-0 h-full overflow-hidden">
                            <SandboxTelemetryPanel
                                pttStatus={pttStatus}
                                turnResult={turnResult}
                                telemetry={telemetry}
                                turnScores={turnScores}
                                onInterrupt={interrupt}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </FormProvider>
    );
});
