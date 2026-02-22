import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCourseStudioStore } from '../../stores/course-studio.store';
import type { LessonSummary } from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lesson: LessonSummary;
    onDeleteClick: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LESSON_TYPE_COLORS: Record<string, string> = {
    VOCAB: 'bg-blue-100 text-blue-700',
    GRAMMAR: 'bg-purple-100 text-purple-700',
    READING: 'bg-green-100 text-green-700',
    LISTENING: 'bg-yellow-100 text-yellow-700',
    SPEAKING: 'bg-orange-100 text-orange-700',
    WRITING: 'bg-pink-100 text-pink-700',
    UNIT_TEST: 'bg-red-100 text-red-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const LessonTreeNode = memo(function LessonTreeNode({ lesson, onDeleteClick }: Props) {
    const { selectedNode, setSelectedNode } = useCourseStudioStore();
    const isSelected = selectedNode?.type === 'lesson' && selectedNode.id === lesson._id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lesson._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
                'hover:bg-accent/50',
                isSelected && 'bg-accent text-accent-foreground',
            )}
            onClick={() => setSelectedNode({ type: 'lesson', id: lesson._id })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedNode({ type: 'lesson', id: lesson._id })}
            aria-label={`Chọn bài học ${lesson.title}`}
            aria-pressed={isSelected}
        >
            {/* Drag Handle */}
            <span
                {...attributes}
                {...listeners}
                className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Kéo để sắp xếp lại"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </span>

            {/* Title */}
            <span className="flex-1 truncate text-xs">{lesson.title}</span>

            {/* Type badge */}
            <Badge
                variant="outline"
                className={cn('h-4 px-1 text-[10px] leading-none shrink-0', LESSON_TYPE_COLORS[lesson.type])}
            >
                {lesson.type}
            </Badge>

            {/* Delete */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick();
                }}
                aria-label={`Delete lesson ${lesson.title}`}
            >
                <Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" />
            </Button>
        </div>
    );
});
