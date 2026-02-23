import { memo, useCallback } from 'react';
import { List, Plus } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { VocabItemCard } from './VocabItemCard';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    items: VocabItem[];
    selectedItemId: string | null;
    onSelectItem: (id: string) => void;
    /** Called with the reordered array after a DnD drag-end. */
    onReorder: (newItems: VocabItem[]) => void;
    /** Called when Admin clicks "+ Thêm từ thủ công". */
    onAddItem: () => void;
    /** When true, missing audioWordUrl will be flagged as an error. */
    generationDone: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isItemInvalid(item: VocabItem, generationDone: boolean): boolean {
    return !item.word || !item.exampleSentence || (generationDone && !item.audioWordUrl);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabNavigator = memo(function VocabNavigator({
    items,
    selectedItemId,
    onSelectItem,
    onReorder,
    onAddItem,
    generationDone,
}: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const reordered = [...items];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        onReorder(reordered);
    }, [items, onReorder]);

    const errorCount = items.filter((item) => isItemInvalid(item, generationDone)).length;

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
                {errorCount > 0 && (
                    <span
                        className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                        aria-label={`${errorCount} từ có lỗi`}
                    >
                        {errorCount} lỗi
                    </span>
                )}
            </div>

            {/* Drag-and-drop sortable list */}
            <ScrollArea className="flex-1">
                {items.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-xs text-muted-foreground px-3 text-center">
                        <p>Chưa có từ vựng. Nhấn "Tạo AI" để bắt đầu.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1 p-2">
                                {items.map((item, index) => (
                                    <VocabItemCard
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedItemId === item.id}
                                        index={index}
                                        hasError={isItemInvalid(item, generationDone)}
                                        onSelect={onSelectItem}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </ScrollArea>

            {/* Add manual item */}
            <div className="shrink-0 border-t p-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onAddItem}
                    aria-label="Thêm từ vựng thủ công"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Thêm từ thủ công
                </Button>
            </div>
        </div>
    );
});
