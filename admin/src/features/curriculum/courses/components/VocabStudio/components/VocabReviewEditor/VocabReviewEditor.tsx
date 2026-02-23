import { memo } from 'react';
import { ContentTab } from './tabs/ContentTab';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    scenario: string;
    item: VocabItem;
    onItemChange: (field: keyof VocabItem, value: string) => void;
    onImageUpload: (itemId: string, file: File) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabReviewEditor = memo(function VocabReviewEditor({
    lessonId,
    scenario,
    item,
    onItemChange,
    onImageUpload,
}: Props) {
    return (
        <div className="flex h-full flex-col">
            {/* Item header */}
            <div className="shrink-0 border-b px-4 py-2.5">
                <p className="text-base font-semibold">{item.word || <em className="text-muted-foreground font-normal">Chưa có từ</em>}</p>
                {item.ipa && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/{item.ipa}/</p>
                )}
            </div>

            {/* Content tab fills remaining space */}
            <div className="flex-1 overflow-hidden">
                <ContentTab
                    lessonId={lessonId}
                    scenario={scenario}
                    item={item}
                    onItemChange={onItemChange}
                    onImageUpload={onImageUpload}
                />
            </div>
        </div>
    );
});
