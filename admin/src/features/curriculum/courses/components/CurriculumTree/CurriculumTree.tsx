import { memo, useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCourseTree } from '../../hooks/useCourses';
import { useCreateUnit, useDeleteUnit, useReorderUnits } from '../../hooks/useUnitMutations';
import { useCreateLesson, useDeleteLesson, useReorderLessons } from '../../hooks/useLessonMutations';
import { AddNodeButton } from '../AddNodeButton/AddNodeButton';
import { DeleteNodeDialog } from '../DeleteNodeDialog/DeleteNodeDialog';
import { CourseTreeNode } from './CourseTreeNode';
import { UnitTreeNode } from './UnitTreeNode';
import type { UnitWithLessons, LessonSummary } from '../../types/course.types';
import type { StudioNodeType } from '../../stores/course-studio.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    courseId: string;
}

interface PendingDelete {
    type: StudioNodeType;
    id: string;
    name: string;
    unitId?: string; // For lesson deletes
}

interface AddLessonTarget {
    unitId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CurriculumTree = memo(function CurriculumTree({ courseId }: Props) {
    const { data: tree, isLoading } = useCourseTree(courseId);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createUnit = useCreateUnit(courseId);
    const deleteUnit = useDeleteUnit(courseId);
    const reorderUnits = useReorderUnits(courseId);
    const deleteLesson = useDeleteLesson(courseId, ''); // unitId resolved at call time
    const reorderLessons = useReorderLessons(courseId);

    // ── dnd-kit sensors ───────────────────────────────────────────────────────
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // ── Dialog state ──────────────────────────────────────────────────────────
    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
    const [addLessonTarget, setAddLessonTarget] = useState<AddLessonTarget | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [addUnitOpen, setAddUnitOpen] = useState(false);
    const [newUnitTitle, setNewUnitTitle] = useState('');

    // ── Unit IDs for top-level sortable ───────────────────────────────────────
    const unitIds = useMemo(() => tree?.units.map((u) => u._id) ?? [], [tree?.units]);

    // ── Lookup helpers ────────────────────────────────────────────────────────
    const findParentUnit = useCallback(
        (lessonId: string): UnitWithLessons | undefined =>
            tree?.units.find((u) => u.lessons.some((l) => l._id === lessonId)),
        [tree?.units],
    );

    // ── Drag End handler ─────────────────────────────────────────────────────
    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id || !tree) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            // Determine if dragging a UNIT or a LESSON
            const isUnit = unitIds.includes(activeId);

            if (isUnit) {
                const oldIndex = unitIds.indexOf(activeId);
                const newIndex = unitIds.indexOf(overId);
                if (oldIndex === -1 || newIndex === -1) return;
                const reordered = arrayMove(unitIds, oldIndex, newIndex);
                reorderUnits.mutate({ courseId, orderedIds: reordered });
            } else {
                // It's a lesson — find its parent unit
                const parentUnit = findParentUnit(activeId);
                if (!parentUnit) return;
                const lessonIds = parentUnit.lessons.map((l) => l._id);
                const oldIdx = lessonIds.indexOf(activeId);
                const newIdx = lessonIds.indexOf(overId);
                if (oldIdx === -1 || newIdx === -1) return;
                const reordered = arrayMove(lessonIds, oldIdx, newIdx);
                reorderLessons.mutate({ unitId: parentUnit._id, orderedIds: reordered });
            }
        },
        [tree, unitIds, courseId, findParentUnit, reorderUnits, reorderLessons],
    );

    // ── Add Unit ──────────────────────────────────────────────────────────────
    const handleAddUnit = useCallback(() => {
        if (!newUnitTitle.trim()) return;
        createUnit.mutate(
            { courseId, title: newUnitTitle.trim() },
            {
                onSuccess: () => {
                    setAddUnitOpen(false);
                    setNewUnitTitle('');
                },
            },
        );
    }, [courseId, createUnit, newUnitTitle]);

    // ── Add Lesson ────────────────────────────────────────────────────────────
    const useCreateLessonForUnit = useCreateLesson(courseId, addLessonTarget?.unitId ?? '');

    const handleAddLesson = useCallback(() => {
        if (!newLessonTitle.trim() || !addLessonTarget) return;
        useCreateLessonForUnit.mutate(
            { unitId: addLessonTarget.unitId, title: newLessonTitle.trim(), type: 'VOCAB' },
            {
                onSuccess: () => {
                    setAddLessonTarget(null);
                    setNewLessonTitle('');
                },
            },
        );
    }, [addLessonTarget, newLessonTitle, useCreateLessonForUnit]);

    // ── Delete confirm ────────────────────────────────────────────────────────
    const handleDeleteConfirm = useCallback(() => {
        if (!pendingDelete) return;
        if (pendingDelete.type === 'unit') {
            deleteUnit.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        } else if (pendingDelete.type === 'lesson') {
            deleteLesson.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }
    }, [deleteUnit, deleteLesson, pendingDelete]);

    // ── Render ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Đang tải..." />
            </div>
        );
    }

    if (!tree) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Không tìm thấy khóa học
            </div>
        );
    }

    return (
        <>
            <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Chương trình học
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {/* Course node */}
                    <CourseTreeNode course={tree} />

                    {/* Units sortable list */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={unitIds} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1">
                                {tree.units.map((unit) => (
                                    <UnitTreeNode
                                        key={unit._id}
                                        unit={unit}
                                        courseId={courseId}
                                        onAddLesson={(unitId) => setAddLessonTarget({ unitId })}
                                        onDeleteUnit={(u: UnitWithLessons) =>
                                            setPendingDelete({ type: 'unit', id: u._id, name: u.title })
                                        }
                                        onDeleteLesson={(lesson: LessonSummary, unitId: string) =>
                                            setPendingDelete({
                                                type: 'lesson',
                                                id: lesson._id,
                                                name: lesson.title,
                                                unitId,
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Add Unit */}
                    <AddNodeButton
                        label="Thêm chương"
                        onClick={() => setAddUnitOpen(true)}
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {pendingDelete && (
                <DeleteNodeDialog
                    open={!!pendingDelete}
                    type={pendingDelete.type}
                    name={pendingDelete.name}
                    isPending={deleteUnit.isPending || deleteLesson.isPending}
                    onConfirm={handleDeleteConfirm}
                    onOpenChange={(open) => !open && setPendingDelete(null)}
                />
            )}

            {/* Add Unit Dialog */}
            <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm chương mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="newUnitTitle">Tên chương</Label>
                        <Input
                            id="newUnitTitle"
                            value={newUnitTitle}
                            onChange={(e) => setNewUnitTitle(e.target.value)}
                            placeholder="VD: Lời chào & Giới thiệu"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddUnitOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleAddUnit}
                            disabled={!newUnitTitle.trim() || createUnit.isPending}
                        >
                            {createUnit.isPending ? 'Đang thêm...' : 'Thêm chương'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Lesson Dialog */}
            <Dialog open={!!addLessonTarget} onOpenChange={(open) => !open && setAddLessonTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm bài học mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="newLessonTitle">Tên bài học</Label>
                        <Input
                            id="newLessonTitle"
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            placeholder="VD: Xin chào & Tạm biệt"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddLesson()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddLessonTarget(null)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleAddLesson}
                            disabled={!newLessonTitle.trim() || useCreateLessonForUnit.isPending}
                        >
                            {useCreateLessonForUnit.isPending ? 'Đang thêm...' : 'Thêm bài học'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
});
