import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { notification } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/api-error';
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
    GrammarBlogBlock,
    GrammarContent,
    GrammarLessonFormValues,
    GenerateGrammarStoryResponse,
    CEFRLevel,
} from '../../types/course.types';

interface Props {
    lesson: LessonSummary;
    courseLevel: CEFRLevel;
}

const createDefaultExplanationBlock = (): GrammarBlogBlock => ({
    id: crypto.randomUUID(),
    type: 'EXPLANATION',
    heading: '',
    body: '',
    examples: [{ en: '', vi: '' }],
    highlightPattern: '',
});

const DEFAULT_FORM_VALUES: GrammarLessonFormValues = {
    level: 'A2',
    readingTime: 4,
    conceptName: '',
    hero: {
        hook: '',
        contextSentences: [],
    },
    blocks: [
        createDefaultExplanationBlock(),
        createDefaultExplanationBlock(),
        createDefaultExplanationBlock(),
        createDefaultExplanationBlock(),
        {
            id: crypto.randomUUID(),
            type: 'INLINE_QUIZ',
            instruction: 'Choose the correct option',
            questions: [],
        },
        {
            id: crypto.randomUUID(),
            type: 'UNIT_CONTEXT_BLOCK',
            heading: '',
            note: '',
            examples: [{ en: '', vi: '' }],
        },
    ],
    summaryTable: {
        columns: ['Giới từ', 'Dùng khi nào', 'Ví dụ'],
        rows: [],
    },
    practiceConfig: {
        mode: 'FIXED',
        passingScore: 70,
    },
    taughtConcepts: [],
};

export const GrammarStudio = memo(function GrammarStudio({ lesson, courseLevel }: Props) {
    const lessonId = lesson._id;

    const { data: content, isLoading, isError } = useGrammarContent(lessonId);

    const saveMutation = useSaveGrammarContent(lessonId);
    const generateStoryMutation = useGenerateGrammarStory(lessonId);
    const generateQuestionsMutation = useGenerateGrammarQuestions(lessonId);
    const generateAudioMutation = useGenerateGrammarAudio(lessonId);

    const {
        activePanel,
        activeBlockId,
        setHeroPanel,
        setSummaryPanel,
        setPracticePanel,
        setActiveBlock,
    } = useGrammarStudioState();

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [generatedAiData, setGeneratedAiData] = useState<GenerateGrammarStoryResponse | null>(null);

    const methods = useForm<GrammarLessonFormValues>({
        defaultValues: {
            ...DEFAULT_FORM_VALUES,
            level: courseLevel,
        },
    });
    const { reset, watch, setValue, handleSubmit, getValues } = methods;

    useEffect(() => {
        if (!content) {
            setValue('level', courseLevel, { shouldDirty: false });
            return;
        }

        const isEmptyServerSeed =
            content.blocks.length === 0
            && content.conceptName.trim().length === 0
            && content.hero.hook.trim().length === 0
            && content.hero.contextSentences.length === 0
            && content.summaryTable.rows.length === 0;

        reset(
            {
                level: isEmptyServerSeed ? courseLevel : (content.level || courseLevel),
                readingTime: content.readingTime,
                conceptName: content.conceptName,
                hero: content.hero,
                blocks: content.blocks,
                summaryTable: content.summaryTable,
                practiceConfig: {
                    mode: 'FIXED',
                    passingScore: content.practiceConfig.passingScore,
                },
                taughtConcepts: content.taughtConcepts,
            },
            { keepDirtyValues: false },
        );

        if (content.blocks.length > 0) {
            setActiveBlock(content.blocks[0]!.id);
        } else {
            setHeroPanel();
        }
    }, [content, courseLevel, reset, setActiveBlock, setHeroPanel, setValue]);

    const formBlocks = watch('blocks');
    const questionIds = content?.practiceConfig?.questionIds ?? [];

    const handleSave = handleSubmit((formValues) => {
        saveMutation.mutate(
            {
                level: formValues.level,
                readingTime: formValues.readingTime,
                conceptName: formValues.conceptName,
                hero: formValues.hero,
                blocks: formValues.blocks,
                summaryTable: formValues.summaryTable,
                practiceConfig: {
                    mode: 'FIXED',
                    passingScore: formValues.practiceConfig.passingScore,
                },
                taughtConcepts: formValues.taughtConcepts,
            },
            {
                onSuccess: () => notification.success('Đã lưu grammar blog'),
                onError: () => notification.error('Lỗi khi lưu grammar blog'),
            },
        );
    });

    const handleGenerateQuestions = useCallback(
        async ({ count, types }: GenerateQuestionsConfig) => {
            setIsGenerateModalOpen(false);

            const formValues = getValues();
            try {
                await saveMutation.mutateAsync({
                    level: formValues.level,
                    readingTime: formValues.readingTime,
                    conceptName: formValues.conceptName,
                    hero: formValues.hero,
                    blocks: formValues.blocks,
                    summaryTable: formValues.summaryTable,
                    practiceConfig: {
                        mode: 'FIXED',
                        passingScore: formValues.practiceConfig.passingScore,
                    },
                    taughtConcepts: formValues.taughtConcepts,
                });
            } catch (error) {
                notification.error(getApiErrorMessage(error, 'Lỗi khi lưu grammar blog trước khi tạo câu hỏi'));
                return;
            }

            generateQuestionsMutation.mutate(
                { count, types: types.length > 0 ? types : undefined },
                {
                    onSuccess: (data) => {
                        notification.success(`Đã tạo ${data.count} câu hỏi cuối bài`);
                        setPracticePanel();
                    },
                    onError: (error) => notification.error(getApiErrorMessage(error, 'Lỗi khi tạo câu hỏi cuối bài')),
                },
            );
        },
        [generateQuestionsMutation, getValues, saveMutation, setPracticePanel],
    );

    const handleGenerateAudio = useCallback(() => {
        generateAudioMutation.mutate(undefined, {
            onSuccess: () => notification.success('Đã đưa vào hàng đợi tạo audio'),
            onError: () => notification.error('Lỗi khi tạo audio'),
        });
    }, [generateAudioMutation]);

    const handleAiGenerate = useCallback(
        (grammarName: string, selectedVocab: string[]) => {
            generateStoryMutation.mutate(
                { grammarName, level: courseLevel, selectedVocab },
                {
                    onSuccess: (data) => setGeneratedAiData(data),
                    onError: () => notification.error('Lỗi khi tạo grammar blog bằng AI'),
                },
            );
        },
        [courseLevel, generateStoryMutation],
    );

    const handleAiConfirm = useCallback(
        (data: GenerateGrammarStoryResponse) => {
            reset(
                (prev) => ({
                    ...prev,
                    level: data.level,
                    readingTime: data.readingTime,
                    conceptName: data.conceptName,
                    hero: data.hero,
                    blocks: data.blocks,
                    summaryTable: data.summaryTable,
                }),
                { keepDirtyValues: false },
            );

            if (data.blocks.length > 0) {
                setActiveBlock(data.blocks[0]!.id);
            }

            setGeneratedAiData(null);
            notification.success('Đã áp dụng grammar blog từ AI');
        },
        [reset, setActiveBlock],
    );

    const createBlock = useCallback((type: GrammarBlogBlock['type']): GrammarBlogBlock => {
        if (type === 'EXPLANATION') {
            return createDefaultExplanationBlock();
        }

        if (type === 'INLINE_QUIZ') {
            return {
                id: crypto.randomUUID(),
                type: 'INLINE_QUIZ',
                instruction: 'Choose the correct option',
                questions: [],
            };
        }

        if (type === 'CALLOUT') {
            return {
                id: crypto.randomUUID(),
                type: 'CALLOUT',
                variant: 'TIP',
                text: '',
            };
        }

        return {
            id: crypto.randomUUID(),
            type: 'UNIT_CONTEXT_BLOCK',
            heading: '',
            note: '',
            examples: [{ en: '', vi: '' }],
        };
    }, []);

    const handleAddBlock = useCallback(
        (type: GrammarBlogBlock['type']) => {
            const nextBlock = createBlock(type);
            setValue('blocks', [...formBlocks, nextBlock], { shouldDirty: true });
            setActiveBlock(nextBlock.id);
        },
        [createBlock, formBlocks, setActiveBlock, setValue],
    );

    const handleDeleteBlock = useCallback(
        (blockId: string) => {
            const next = formBlocks.filter((block) => block.id !== blockId);
            setValue('blocks', next, { shouldDirty: true });
            if (activeBlockId === blockId) {
                if (next.length > 0) {
                    setActiveBlock(next[0]!.id);
                } else {
                    setHeroPanel();
                }
            }
        },
        [activeBlockId, formBlocks, setActiveBlock, setHeroPanel, setValue],
    );

    const handleDuplicateBlock = useCallback(
        (blockId: string) => {
            const target = formBlocks.find((block) => block.id === blockId);
            if (!target) {
                return;
            }

            const cloned = {
                ...target,
                id: crypto.randomUUID(),
            } as GrammarBlogBlock;

            const index = formBlocks.findIndex((block) => block.id === blockId);
            const next = formBlocks.slice();
            next.splice(index + 1, 0, cloned);
            setValue('blocks', next, { shouldDirty: true });
            setActiveBlock(cloned.id);
        },
        [formBlocks, setActiveBlock, setValue],
    );

    const handleReorderBlocks = useCallback(
        (nextBlocks: GrammarBlogBlock[]) => {
            setValue('blocks', nextBlocks, { shouldDirty: true });
        },
        [setValue],
    );

    const passingScore = useMemo(
        () => content?.practiceConfig?.passingScore ?? lesson.practiceConfig.passingScore,
        [content?.practiceConfig?.passingScore, lesson.practiceConfig.passingScore],
    );

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
                    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/60" aria-hidden="true" />
                    <p>Không tải được grammar content.</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <div className="flex h-full flex-col overflow-hidden">
                <GrammarTopBar
                    lessonId={lessonId}
                    lessonTitle={lesson.title}
                    isSaving={saveMutation.isPending}
                    isGeneratingQuestions={generateQuestionsMutation.isPending}
                    isGeneratingAudio={generateAudioMutation.isPending}
                    questionsCount={questionIds.length}
                    questionIds={questionIds}
                    passingScore={passingScore}
                    onSave={handleSave}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                    onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
                    onGenerateAudio={handleGenerateAudio}
                />

                <div className="flex flex-1 overflow-hidden">
                    <div className="w-[320px] overflow-hidden">
                        <GrammarNavigator
                            blocks={formBlocks}
                            activePanel={activePanel}
                            activeBlockId={activeBlockId}
                            onHeroClick={setHeroPanel}
                            onSummaryClick={setSummaryPanel}
                            onPracticeClick={setPracticePanel}
                            onBlockClick={setActiveBlock}
                            onAddBlock={handleAddBlock}
                            onDuplicateBlock={handleDuplicateBlock}
                            onDeleteBlock={handleDeleteBlock}
                            onReorderBlocks={handleReorderBlocks}
                        />
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <GrammarEditor
                            activePanel={activePanel}
                            activeBlockId={activeBlockId}
                            lessonId={lessonId}
                            questionIds={questionIds as GrammarContent['practiceConfig']['questionIds']}
                        />
                    </div>
                </div>
            </div>

            <GenerateQuestionsModal
                open={isGenerateModalOpen}
                isGenerating={generateQuestionsMutation.isPending}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleGenerateQuestions}
            />

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
