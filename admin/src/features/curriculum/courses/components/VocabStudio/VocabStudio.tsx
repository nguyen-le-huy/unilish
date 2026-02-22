import { memo, useCallback, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { notification } from '@/lib/notification';
import { useVocabContent } from '../../hooks/useVocabContent';
import { useGenerateVocab, useSaveVocabContent, useGenerateAllAudio } from '../../hooks/useVocabMutations';
import { useGenerationStatus } from '../../hooks/useGenerationStatus';
import { VocabTopBar } from './components/VocabTopBar/VocabTopBar';
import { VocabNavigator } from './components/VocabNavigator/VocabNavigator';
import { VocabReviewEditor } from './components/VocabReviewEditor/VocabReviewEditor';
import { AutoGenerateModal } from './components/AutoGenerateModal/AutoGenerateModal';
import { GenerationProgress } from './components/GenerationProgress/GenerationProgress';
import { useVocabStudioState } from './hooks/useVocabStudioState';
import type { LessonSummary, VocabItem } from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lesson: LessonSummary;
    courseId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabStudio = memo(function VocabStudio({ lesson }: Props) {
    const lessonId = lesson._id;
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    // ── Data ────────────────────────────────────────────────────────────────
    const { data: content, isLoading, isError } = useVocabContent(lessonId);
    const { data: statusData } = useGenerationStatus(lessonId);

    // ── Mutations ───────────────────────────────────────────────────────────
    const generateMutation = useGenerateVocab(lessonId);
    const saveMutation = useSaveVocabContent(lessonId);    const generateAudioMutation = useGenerateAllAudio(lessonId);
    // ── Local UI state ──────────────────────────────────────────────────────
    const { selectedItemId, selectItem, updateItem, applyDirtyToContent, clearDirty } =
        useVocabStudioState();

    // ── Derived ──────────────────────────────────────────────────────────────
    const generationStatus = statusData?.status ?? content?.generationStatus ?? 'IDLE';
    const items = useMemo(() => content?.items ?? [], [content]);

    const selectedItem = useMemo(
        () => items.find((i) => i.id === selectedItemId) ?? items[0] ?? null,
        [items, selectedItemId],
    );

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleGenerate = useCallback(
        (config: { wordCount: number; wordList?: string[] }) => {
            generateMutation.mutate(config, {
                onSuccess: () => {
                    setIsGenerateModalOpen(false);
                    notification.success('Đang tạo từ vựng…');
                },
                onError: () => notification.error('Lỗi khi tạo từ vựng'),
            });
        },
        [generateMutation],
    );

    const handleGenerateAllAudio = useCallback(() => {
        generateAudioMutation.mutate(undefined, {
            onSuccess: () => notification.success('Đã đưa vào hàng đợi tạo âm thanh…'),
            onError: () => notification.error('Lỗi khi tạo âm thanh'),
        });
    }, [generateAudioMutation]);

    const handleSave = useCallback(() => {
        if (!content) return;

        const merged = applyDirtyToContent(content);
        saveMutation.mutate(
            {
                scenario: merged.scenario,
                generationStatus: merged.generationStatus,
                items: merged.items,
            },
            {
                onSuccess: () => {
                    clearDirty();
                    notification.success('Đã lưu nội dung từ vựng');
                },
                onError: () => notification.error('Lỗi khi lưu nội dung'),
            },
        );
    }, [content, applyDirtyToContent, saveMutation, clearDirty]);

    const handleItemChange = useCallback(
        (field: keyof VocabItem, value: string) => {
            if (selectedItem) {
                updateItem(selectedItem.id, field, value);
            }
        },
        [selectedItem, updateItem],
    );

    // ── Effective item (server data + local dirty edits) ──────────────────────

    const effectiveItem = useMemo((): VocabItem | null => {
        if (!selectedItem) return null;
        if (!content) return selectedItem;
        const merged = applyDirtyToContent(content);
        return merged.items.find((i) => i.id === selectedItem.id) ?? selectedItem;
    }, [selectedItem, content, applyDirtyToContent]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex h-full flex-col gap-3 p-4">
                <Skeleton className="h-10 w-full" />
                <div className="flex flex-1 gap-3">
                    <Skeleton className="w-1/3 h-full" />
                    <Skeleton className="w-2/3 h-full" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <div className="space-y-2">
                    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/60" aria-hidden="true" />
                    <p>Không tải được nội dung từ vựng.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex h-full flex-col overflow-hidden">
                {/* Top Bar */}
                <VocabTopBar
                    lessonTitle={lesson.title}
                    itemCount={items.length}
                    generationStatus={generationStatus}
                    isSaving={saveMutation.isPending}
                    isGeneratingAudio={generateAudioMutation.isPending}
                    onSave={handleSave}
                    onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
                    onGenerateAllAudio={handleGenerateAllAudio}
                />

                {/* Generation Progress Banner */}
                {generationStatus !== 'IDLE' && generationStatus !== 'DONE' && (
                    <div className="shrink-0 px-4 pt-3">
                        <GenerationProgress
                            status={generationStatus}
                            itemCount={statusData?.itemCount ?? 0}
                        />
                    </div>
                )}

                {/* Split Pane: Navigator | Editor */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Item Navigator */}
                    <div className="w-2/5 overflow-hidden">
                        <VocabNavigator
                            items={items}
                            selectedItemId={selectedItem?.id ?? null}
                            onSelectItem={selectItem}
                        />
                    </div>

                    {/* Right: Review Editor */}
                    <div className="flex-1 overflow-hidden">
                        {effectiveItem ? (
                            <VocabReviewEditor
                                lessonId={lessonId}
                                item={effectiveItem}
                                onItemChange={handleItemChange}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                <p>Chọn một từ để chỉnh sửa</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Auto Generate Modal */}
            <AutoGenerateModal
                open={isGenerateModalOpen}
                isLoading={generateMutation.isPending}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleGenerate}
            />
        </>
    );
});
