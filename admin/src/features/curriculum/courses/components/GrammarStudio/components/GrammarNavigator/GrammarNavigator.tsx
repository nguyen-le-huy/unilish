import { memo } from 'react';
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookOpen, Table2, GripVertical, Plus, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { GrammarBlogBlock } from '../../../../types/course.types';
import type { GrammarPanel } from '../../hooks/useGrammarStudioState';

interface Props {
    blocks: GrammarBlogBlock[];
    activePanel: GrammarPanel;
    activeBlockId: string | null;
    onHeroClick: () => void;
    onSummaryClick: () => void;
    onBlockClick: (blockId: string) => void;
    onAddBlock: (type: GrammarBlogBlock['type']) => void;
    onDuplicateBlock: (blockId: string) => void;
    onDeleteBlock: (blockId: string) => void;
    onReorderBlocks: (nextBlocks: GrammarBlogBlock[]) => void;
}

interface SortableBlockItemProps {
    block: GrammarBlogBlock;
    isActive: boolean;
    onSelect: (blockId: string) => void;
    onDuplicate: (blockId: string) => void;
    onDelete: (blockId: string) => void;
}

function SortableBlockItem({
    block,
    isActive,
    onSelect,
    onDuplicate,
    onDelete,
}: SortableBlockItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <li ref={setNodeRef} style={style}>
            <div
                className={cn(
                    'group flex items-center gap-2 rounded-md border px-2 py-2 text-xs',
                    isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background',
                )}
            >
                <button
                    type="button"
                    className="cursor-grab text-muted-foreground"
                    {...attributes}
                    {...listeners}
                    aria-label="Reorder block"
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => onSelect(block.id)}
                >
                    {block.type}
                </button>

                <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    onClick={() => onDuplicate(block.id)}
                    aria-label="Duplicate block"
                >
                    <Copy className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    className="rounded p-1 text-destructive/80 hover:bg-destructive/10"
                    onClick={() => onDelete(block.id)}
                    aria-label="Delete block"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </li>
    );
}

export const GrammarNavigator = memo(function GrammarNavigator({
    blocks,
    activePanel,
    activeBlockId,
    onHeroClick,
    onSummaryClick,
    onBlockClick,
    onAddBlock,
    onDuplicateBlock,
    onDeleteBlock,
    onReorderBlocks,
}: Props) {
    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = blocks.findIndex((item) => item.id === active.id);
        const newIndex = blocks.findIndex((item) => item.id === over.id);
        if (oldIndex < 0 || newIndex < 0) {
            return;
        }

        onReorderBlocks(arrayMove(blocks, oldIndex, newIndex));
    };

    return (
        <div className="flex h-full flex-col border-r bg-muted/20">
            <div className="border-b px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grammar Blog</p>
            </div>

            <div className="space-y-2 p-2">
                <Button
                    variant={activePanel === 'hero' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={onHeroClick}
                >
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                    Hero
                </Button>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-1">
                            {blocks.map((block) => (
                                <SortableBlockItem
                                    key={block.id}
                                    block={block}
                                    isActive={activePanel === 'block' && activeBlockId === block.id}
                                    onSelect={onBlockClick}
                                    onDuplicate={onDuplicateBlock}
                                    onDelete={onDeleteBlock}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start border-dashed">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add block
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => onAddBlock('EXPLANATION')}>EXPLANATION</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddBlock('INLINE_QUIZ')}>INLINE_QUIZ</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddBlock('CALLOUT')}>CALLOUT</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddBlock('UNIT_CONTEXT_BLOCK')}>UNIT_CONTEXT_BLOCK</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    variant={activePanel === 'summary' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={onSummaryClick}
                >
                    <Table2 className="mr-1.5 h-3.5 w-3.5" />
                    Summary table
                </Button>

            </div>
        </div>
    );
});
