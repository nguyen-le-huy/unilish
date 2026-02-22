import { memo } from 'react';
import { List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VocabItemCard } from './VocabItemCard';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    items: VocabItem[];
    selectedItemId: string | null;
    onSelectItem: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabNavigator = memo(function VocabNavigator({
    items,
    selectedItemId,
    onSelectItem,
}: Props) {
    return (
        <div className="flex h-full flex-col border-r bg-muted/20">
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
                <List className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Từ vựng
                </span>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {items.length}
                </span>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                {items.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-xs text-muted-foreground px-3 text-center">
                        <p>Chưa có từ vựng. Nhấn "Tạo AI" để bắt đầu.</p>
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {items.map((item, index) => (
                            <VocabItemCard
                                key={item.id}
                                item={item}
                                isSelected={selectedItemId === item.id}
                                index={index}
                                onSelect={onSelectItem}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
});
