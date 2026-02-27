import { memo, useCallback, useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { notification } from '@/lib/notification';
import { useReadingContent } from '../../hooks/useReadingContent';
import {
    useSaveReadingContent,
    useGenerateReadingContent,
    useGenerateReadingQuestions,
    useGenerateReadingAudio,
    useFillGlossary,
} from '../../hooks/useReadingMutations';
import { ReadingTopBar } from './components/ReadingTopBar/ReadingTopBar';
import { ReadingNavigator } from './components/ReadingNavigator/ReadingNavigator';
import { ReadingEditor } from './components/ReadingEditor/ReadingEditor';
import { AiGenerateModal } from './components/AiGenerateModal/AiGenerateModal';
import {
    ReadingGenerateQuestionsModal,
    type GenerateReadingQuestionsConfig,
} from './components/ReadingGenerateQuestionsModal/ReadingGenerateQuestionsModal';
import { useReadingStudioState } from './hooks/useReadingStudioState';
import type {
    LessonSummary,
    ReadingLessonFormValues,
    ReadingContent,
    ReadingGenerationPayload,
    CEFRLevel,
} from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lesson: LessonSummary;
    courseLevel: CEFRLevel;
}

// ─── Default form values (used while data is loading / content is empty) ──────

const DEFAULT_FORM_VALUES: ReadingLessonFormValues = {
    text: '',
    translation: '',
    glossary: {},
    media: {
        audioUrl: null,
        durationSec: 0,
        speed: 1,
    },
    practiceConfig: {
        mode: 'FIXED',
        passingScore: 70,
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingStudio = memo(function ReadingStudio({ lesson, courseLevel }: Props) {
    const lessonId = lesson._id;

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: content, isLoading, isError } = useReadingContent(lessonId);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const saveMutation = useSaveReadingContent(lessonId);
    const generateContentMutation = useGenerateReadingContent(lessonId);
    const generateQuestionsMutation = useGenerateReadingQuestions(lessonId);
    const generateAudioMutation = useGenerateReadingAudio(lessonId);
    const fillGlossaryMutation = useFillGlossary(lessonId);

    // ── UI state ──────────────────────────────────────────────────────────────
    const { activeSection, setActiveSection } = useReadingStudioState();
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    // ── Form ──────────────────────────────────────────────────────────────────
    const methods = useForm<ReadingLessonFormValues>({
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const { reset, handleSubmit } = methods;

    // ── Seed form when data loads ─────────────────────────────────────────────
    useEffect(() => {
        if (!content) return;

        reset(
            {
                text: content.text,
                translation: content.translation ?? '',
                glossary: content.glossary,
                media: content.media,
                practiceConfig: {
                    mode: content.practiceConfig.mode,
                    passingScore: content.practiceConfig.passingScore,
                },
            },
            { keepDirtyValues: false },
        );
    }, [content, reset]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const questionIds = content?.practiceConfig?.questionIds ?? [];

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSave = handleSubmit((formValues: ReadingLessonFormValues) => {
        saveMutation.mutate(
            {
                text: formValues.text,
                translation: formValues.translation,
                glossary: formValues.glossary,
                practiceConfig: {
                    mode: formValues.practiceConfig.mode,
                    passingScore: formValues.practiceConfig.passingScore,
                },
            },
            {
                onSuccess: () => notification.success('Đã lưu nội dung bài đọc'),
                onError: () => notification.error('Lỗi khi lưu nội dung'),
            },
        );
    });

    const handleAiGenerate = useCallback(
        (payload: ReadingGenerationPayload) => {
            setIsAiModalOpen(false);
            generateContentMutation.mutate(payload, {
                onSuccess: (data) => {
                    // Patch form with AI-generated text + translation + glossary
                    reset(
                        (prev) => ({
                            ...prev,
                            text: data.text,
                            translation: data.translation ?? '',
                            glossary: data.glossary,
                        }),
                        { keepDirtyValues: false },
                    );
                    notification.success('Đã áp dụng nội dung AI vào form');
                    setActiveSection('text');
                },
                onError: () => notification.error('Lỗi khi tạo bài đọc bằng AI'),
            });
        },
        [generateContentMutation, reset, setActiveSection],
    );

    const handleGenerateQuestions = useCallback(
        ({ count, types }: GenerateReadingQuestionsConfig) => {
            setIsGenerateModalOpen(false);
            generateQuestionsMutation.mutate(
                { count, types: types.length > 0 ? types : undefined },
                {
                    onSuccess: (data) => {
                        notification.success(`Đã tạo ${data.count} câu hỏi comprehension`);
                        setActiveSection('practice');
                    },
                    onError: () => notification.error('Lỗi khi tạo câu hỏi'),
                },
            );
        },
        [generateQuestionsMutation, setActiveSection],
    );

    const handleGenerateAudio = useCallback(() => {
        generateAudioMutation.mutate(undefined, {
            onSuccess: () =>
                notification.success('Đã đưa vào hàng đợi tạo âm thanh bài đọc…'),
            onError: () => notification.error('Lỗi khi tạo âm thanh'),
        });
    }, [generateAudioMutation]);

    const handleFillGlossary = useCallback(() => {
        fillGlossaryMutation.mutate(undefined, {
            onSuccess: () => notification.success('Đã điền nghĩa từ vựng bằng AI'),
            onError: () => notification.error('Lỗi khi điền nghĩa từ vựng'),
        });
    }, [fillGlossaryMutation]);

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
                    <p>Không tải được nội dung bài đọc.</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            {/* Outer flex column */}
            <div className="flex h-full flex-col overflow-hidden">
                {/* Top Bar */}
                <ReadingTopBar
                    lessonId={lessonId}
                    lessonTitle={lesson.title}
                    isSaving={saveMutation.isPending}
                    isGenerating={generateContentMutation.isPending}
                    isGeneratingQuestions={generateQuestionsMutation.isPending}
                    isGeneratingAudio={generateAudioMutation.isPending}
                    questionsCount={questionIds.length}
                    questionIds={questionIds}
                    passingScore={
                        content?.practiceConfig?.passingScore ??
                        lesson.practiceConfig.passingScore
                    }
                    onSave={handleSave}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                    onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
                    onGenerateAudio={handleGenerateAudio}
                />

                {/* Split Pane: Navigator | Editor */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Section Navigator — 25% */}
                    <div className="w-1/4 overflow-hidden">
                        <ReadingNavigator
                            activeSection={activeSection}
                            onSectionChange={setActiveSection}
                            hasTextError={false}
                        />
                    </div>

                    {/* Right: Dynamic Content Editor — 75% */}
                    <div className="flex-1 overflow-hidden">
                        <ReadingEditor
                            activeSection={activeSection}
                            lessonId={lessonId}
                            questionIds={questionIds as ReadingContent['practiceConfig']['questionIds']}
                            isFillGlossaryPending={fillGlossaryMutation.isPending}
                            onFillGlossary={handleFillGlossary}
                        />
                    </div>
                </div>
            </div>

            {/* Generate Questions Config Modal */}
            <ReadingGenerateQuestionsModal
                open={isGenerateModalOpen}
                isGenerating={generateQuestionsMutation.isPending}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleGenerateQuestions}
            />

            {/* AI Generate Content Modal */}
            <AiGenerateModal
                open={isAiModalOpen}
                isGenerating={generateContentMutation.isPending}
                courseLevel={courseLevel}
                onClose={() => setIsAiModalOpen(false)}
                onGenerate={handleAiGenerate}
            />
        </FormProvider>
    );
});
