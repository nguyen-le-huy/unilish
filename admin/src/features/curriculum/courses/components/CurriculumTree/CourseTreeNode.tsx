import { memo } from 'react';
import { BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCourseStudioStore } from '../../stores/course-studio.store';
import type { CourseTreeDTO } from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    course: CourseTreeDTO;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-emerald-100 text-emerald-700',
    B1: 'bg-blue-100 text-blue-700',
    B2: 'bg-indigo-100 text-indigo-700',
    C1: 'bg-purple-100 text-purple-700',
    C2: 'bg-red-100 text-red-700',
};

export const CourseTreeNode = memo(function CourseTreeNode({ course }: Props) {
    const { selectedNode, setSelectedNode } = useCourseStudioStore();
    const isSelected = selectedNode?.type === 'course' && selectedNode.id === course._id;

    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors mb-2',
                'hover:bg-accent/50',
                isSelected && 'bg-accent text-accent-foreground',
            )}
            onClick={() => setSelectedNode({ type: 'course', id: course._id })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedNode({ type: 'course', id: course._id })}
            aria-label={`Chọn khóa học ${course.name}`}
            aria-pressed={isSelected}
        >
            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 truncate text-sm font-semibold">{course.name}</span>
            <Badge
                variant="outline"
                className={cn('h-5 shrink-0 text-[11px]', CEFR_COLORS[course.level])}
            >
                {course.level}
            </Badge>
        </div>
    );
});
