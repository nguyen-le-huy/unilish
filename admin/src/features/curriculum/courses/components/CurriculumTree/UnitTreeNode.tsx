import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCourseStudioStore } from '../../stores/course-studio.store';
import { AddNodeButton } from '../AddNodeButton/AddNodeButton';
import { LessonTreeNode } from './LessonTreeNode';
import type { UnitWithLessons, LessonSummary } from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    unit: UnitWithLessons;
    courseId: string;
    onAddLesson: (unitId: string) => void;
    onDeleteUnit: (unit: UnitWithLessons) => void;
    onDeleteLesson: (lesson: LessonSummary, unitId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UnitTreeNode = memo(function UnitTreeNode({
    unit,
    onAddLesson,
    onDeleteUnit,
    onDeleteLesson,
}: Props) {
    const [isOpen, setIsOpen] = useState(true);
    const { selectedNode, setSelectedNode } = useCourseStudioStore();
    const isSelected = selectedNode?.type === 'unit' && selectedNode.id === unit._id;
    const lessonIds = unit.lessons.map((l) => l._id);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: unit._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="select-none">
            {/* Unit Header Row */}
            <div
                className={cn(
                    'group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
                    'hover:bg-accent/50',
                    isSelected && 'bg-accent text-accent-foreground',
                )}
                onClick={() => setSelectedNode({ type: 'unit', id: unit._id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode({ type: 'unit', id: unit._id })}
                aria-label={`Chọn chương ${unit.title}`}
                aria-pressed={isSelected}
                aria-expanded={isOpen}
            >
                {/* Drag Handle */}
                <span
                    {...attributes}
                    {...listeners}
                    className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-label="Kéo để sắp xếp lại chương"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>

                {/* Collapse toggle */}
                <button
                    type="button"
                    className="shrink-0 rounded-sm p-0.5 hover:bg-muted"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen((prev) => !prev);
                    }}
                    aria-label={isOpen ? 'Thu gọn chương' : 'Mở rộng chương'}
                >
                    {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                </button>

                {/* Title */}
                <span className="flex-1 truncate text-sm font-medium">{unit.title}</span>

                {/* Lesson count */}
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {unit.lessons.length}
                </span>

                {/* Delete */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUnit(unit);
                    }}
                    aria-label={`Xóa chương ${unit.title}`}
                >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                </Button>
            </div>

            {/* Lessons (collapsible) */}
            {isOpen && (
                <div className="ml-6 border-l pl-2 py-0.5 space-y-0.5">
                    <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                        {unit.lessons.map((lesson) => (
                            <LessonTreeNode
                                key={lesson._id}
                                lesson={lesson}
                                onDeleteClick={() => onDeleteLesson(lesson, unit._id)}
                            />
                        ))}
                    </SortableContext>

                    <AddNodeButton
                        label="Thêm bài học"
                        onClick={() => onAddLesson(unit._id)}
                    />
                </div>
            )}
        </div>
    );
});
