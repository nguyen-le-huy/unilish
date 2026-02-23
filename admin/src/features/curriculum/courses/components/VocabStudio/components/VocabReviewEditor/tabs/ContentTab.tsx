import { memo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LinguisticBlock } from '../blocks/LinguisticBlock';
import { ContextBlock } from '../blocks/ContextBlock';
import { MultimediaBlock } from '../blocks/MultimediaBlock';
import { useRegenerateAudio } from '../../../../../hooks/useVocabMutations';
import { notification } from '@/lib/notification';
import type { VocabItem } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    /** The scenario from Unit.contextSeed.scenario—forwarded to ContextBlock for constraint banner */
    scenario: string;
    item: VocabItem;
    onItemChange: (field: keyof VocabItem, value: string) => void;
    /** Called with the raw File object when Admin uploads an image */
    onImageUpload: (itemId: string, file: File) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ContentTab = memo(function ContentTab({
    lessonId,
    scenario,
    item,
    onItemChange,
    onImageUpload,
}: Props) {
    const regenMutation = useRegenerateAudio(lessonId);

    const handleRegenerateAudio = useCallback(
        (target: 'word' | 'sentence') => {
            regenMutation.mutate(
                { itemId: item.id, payload: { target } },
                {
                    onSuccess: () =>
                        notification.success('Đã đưa vào hàng đợi tạo lại âm thanh'),
                    onError: () => notification.error('Lỗi khi tạo lại âm thanh'),
                },
            );
        },
        [regenMutation, item.id],
    );

    const handleImageUpload = useCallback(
        (file: File) => {
            onImageUpload(item.id, file);
        },
        [item.id, onImageUpload],
    );

    const isRegeneratingWord =
        regenMutation.isPending && regenMutation.variables?.payload.target === 'word';
    const isRegeneratingSentence =
        regenMutation.isPending && regenMutation.variables?.payload.target === 'sentence';

    return (
        <ScrollArea className="h-full">
            <div className="space-y-6 p-4">
                <LinguisticBlock item={item} onChange={onItemChange} />

                <Separator />

                <ContextBlock item={item} scenario={scenario} onChange={onItemChange} />

                <Separator />

                <MultimediaBlock
                    item={item}
                    isRegeneratingWord={isRegeneratingWord}
                    isRegeneratingSentence={isRegeneratingSentence}
                    onRegenerateAudio={handleRegenerateAudio}
                    onImageUpload={handleImageUpload}
                />
            </div>
        </ScrollArea>
    );
});
