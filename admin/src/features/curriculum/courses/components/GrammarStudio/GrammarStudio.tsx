import { memo, useCallback, useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { notification } from '@/lib/notification';
import { useGrammarContent } from '../../hooks/useGrammarContent';
import {
    useSaveGrammarContent,
    useGenerateGrammarStory,
    useGenerateGrammarQuestions,
    useGenerateGrammarAudio,
} from '../../hooks/useGrammarMutations';
import { GrammarTopBar } from './components/GrammarTopBar/GrammarTopBar';
import { GrammarNavigator } from './components/GrammarNavigator/GrammarNavigator';
import { GrammarEditor } from './components/GrammarEditor/GrammarEditor';
import { AiStoryModal } from './components/AiStoryModal/AiStoryModal';
import {
    GenerateQuestionsModal,
    type GenerateQuestionsConfig,
} from './components/GenerateQuestionsModal/GenerateQuestionsModal';
import { useGrammarStudioState } from './hooks/useGrammarStudioState';
import type {
    LessonSummary,
    GrammarLessonFormValues,
    GrammarContent,
    GenerateGrammarStoryResponse,
} from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lesson: LessonSummary;
}

// ─── Default form values (used while data is loading) ─────────────────────────

const DEFAULT_FORM_VALUES: GrammarLessonFormValues = {
    context_story: {
        text: '',
        translation: '',
        audioUrl: null,
        highlights: [],
    },
    grammar_rule: {
        name: '',
        usage: '',
        formulas: [],
        irregular_verbs: [],
    },
    practiceConfig: {
        mode: 'FIXED',
        passingScore: 70,
    },
    taughtConcepts: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export const GrammarStudio = memo(function GrammarStudio({ lesson }: Props) {
    const lessonId = lesson._id;

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data: content, isLoading, isError } = useGrammarContent(lessonId);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const saveMutation = useSaveGrammarContent(lessonId);
    const generateStoryMutation = useGenerateGrammarStory(lessonId);
    const generateQuestionsMutation = useGenerateGrammarQuestions(lessonId);
    const generateAudioMutation = useGenerateGrammarAudio(lessonId);

    // ── UI state ──────────────────────────────────────────────────────────────
    const { activeSection, setActiveSection } = useGrammarStudioState();
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [generatedAiData, setGeneratedAiData] =
        useState<GenerateGrammarStoryResponse | null>(null);

    // ── Form ──────────────────────────────────────────────────────────────────
    const methods = useForm<GrammarLessonFormValues>({
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const { reset, handleSubmit, formState: { errors } } = methods;

    // ── Seed form when data loads ─────────────────────────────────────────────
    useEffect(() => {
        if (!content) return;

        reset(
            {
                context_story: content.context_story,
                grammar_rule: content.grammar_rule,
                practiceConfig: {
                    mode: content.practiceConfig.mode,
                    passingScore: content.practiceConfig.passingScore,
                },
                taughtConcepts: content.taughtConcepts,
            },
            { keepDirtyValues: false },
        );
    }, [content, reset]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const questionIds = content?.practiceConfig?.questionIds ?? [];

    const hasStoryError =
        !!errors.context_story?.text || !!errors.context_story?.highlights;

    const hasRulesError =
        !!errors.grammar_rule?.name || !!errors.grammar_rule?.formulas;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSave = handleSubmit((formValues: GrammarLessonFormValues) => {
        const payload = {
            context_story: formValues.context_story,
            grammar_rule: formValues.grammar_rule,
            practiceConfig: {
                mode: formValues.practiceConfig.mode,
                passingScore: formValues.practiceConfig.passingScore,
            },
            taughtConcepts: formValues.taughtConcepts,
        };

        saveMutation.mutate(payload, {
            onSuccess: () => notification.success('Đã lưu nội dung ngữ pháp'),
            onError: () => notification.error('Lỗi khi lưu nội dung'),
        });
    });

    const handleGenerateQuestions = useCallback((
        { count, types }: GenerateQuestionsConfig,
    ) => {
        setIsGenerateModalOpen(false);
        generateQuestionsMutation.mutate(
            { count, types: types.length > 0 ? types : undefined },
            {
                onSuccess: (data) => {
                    notification.success(`Đã tạo ${data.count} câu hỏi luyện tập`);
                    setActiveSection('practice');
                },
                onError: () => notification.error('Lỗi khi tạo câu hỏi'),
            },
        );
    }, [generateQuestionsMutation, setActiveSection]);

    const handleGenerateAudio = useCallback(() => {
        generateAudioMutation.mutate(undefined, {
            onSuccess: () =>
                notification.success('Đã đưa vào hàng đợi tạo âm thanh…'),
            onError: () => notification.error('Lỗi khi tạo âm thanh'),
        });
    }, [generateAudioMutation]);

    const handleAiGenerate = useCallback(
        (grammarName: string, selectedVocab: string[]) => {
            generateStoryMutation.mutate(
                { grammarName, selectedVocab },
                {
                    onSuccess: (data) => setGeneratedAiData(data),
                    onError: () => {
                        notification.error('Lỗi khi tạo câu chuyện ngữ pháp bằng AI');
                    },
                },
            );
        },
        [generateStoryMutation],
    );

    const handleAiConfirm = useCallback(
        (data: GenerateGrammarStoryResponse) => {
            reset(
                (prev) => ({
                    ...prev,
                    context_story: data.context_story,
                    grammar_rule: data.grammar_rule,
                }),
                { keepDirtyValues: false },
            );
            setGeneratedAiData(null);
            notification.success('Đã áp dụng nội dung AI vào form');
        },
        [reset],
    );

    // ── Render ─────────────────────────────────────────────────────────────────

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
                    <p>Không tải được nội dung ngữ pháp.</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            {/* Outer flex column matching VocabStudio pattern */}
            <div className="flex h-full flex-col overflow-hidden">
                {/* Top Bar */}
                <GrammarTopBar
                    lessonId={lessonId}
                    lessonTitle={lesson.title}
                    isSaving={saveMutation.isPending}
                    isGeneratingQuestions={generateQuestionsMutation.isPending}
                    isGeneratingAudio={generateAudioMutation.isPending}
                    questionsCount={questionIds.length}
                    questionIds={questionIds}
                    passingScore={content?.practiceConfig?.passingScore ?? lesson.practiceConfig.passingScore}
                    onSave={handleSave}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                    onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
                    onGenerateAudio={handleGenerateAudio}
                />

                {/* Split Pane: Navigator | Editor */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Section Navigator — 25% */}
                    <div className="w-1/4 overflow-hidden">
                        <GrammarNavigator
                            activeSection={activeSection}
                            onSectionChange={setActiveSection}
                            hasStoryError={hasStoryError}
                            hasRulesError={hasRulesError}
                        />
                    </div>

                    {/* Right: Dynamic Content Editor — 75% */}
                    <div className="flex-1 overflow-hidden">
                        <GrammarEditor
                            activeSection={activeSection}
                            lessonId={lessonId}
                            questionIds={questionIds as GrammarContent['practiceConfig']['questionIds']}
                        />
                    </div>
                </div>
            </div>

            {/* Generate Questions Config Modal */}
            <GenerateQuestionsModal
                open={isGenerateModalOpen}
                isGenerating={generateQuestionsMutation.isPending}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleGenerateQuestions}
            />

            {/* AI Story Modal (portal — outside layout flow) */}
            <AiStoryModal
                open={isAiModalOpen}
                isGenerating={generateStoryMutation.isPending}
                onClose={() => setIsAiModalOpen(false)}
                onGenerate={handleAiGenerate}
                generatedData={generatedAiData}
                onConfirm={handleAiConfirm}
            />
        </FormProvider>
    );
});
