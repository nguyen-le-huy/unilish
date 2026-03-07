import { useState, useCallback } from 'react';
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
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, BookOpen, FileText, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MCQModuleForm } from './modules/MCQModuleForm';
import { EssayModuleForm } from './modules/EssayModuleForm';
import { SpeakingModuleForm } from './modules/SpeakingModuleForm';
import type { IPlacementTestModule, ModuleType, IModuleMCQ, IModuleEssay, IModuleSpeaking } from '../../types';

// ─── Module type meta ─────────────────────────────────────────────────────────

const MODULE_META: Record<ModuleType, { label: string; icon: React.ElementType; color: string }> = {
    mcq: { label: 'MCQ', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
    essay: { label: 'Writing', icon: FileText, color: 'bg-purple-100 text-purple-700' },
    speaking: { label: 'Speaking', icon: Mic, color: 'bg-green-100 text-green-700' },
};

// ─── Sortable Item ────────────────────────────────────────────────────────────

interface SortableItemProps {
    module: IPlacementTestModule & { id: string };
    onEdit: () => void;
    onRemove: () => void;
}

function SortableItem({ module, onEdit, onRemove }: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: module.id });

    const meta = MODULE_META[module.type];
    const Icon = meta.icon;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
                aria-label="Kéo để sắp xếp"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <div className={`flex h-8 w-8 items-center justify-center rounded ${meta.color}`}>
                <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{module.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-4">{meta.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                        {module.type === 'mcq'
                            ? `${(module as IModuleMCQ).parts?.length ?? 0} parts · ${(module as IModuleMCQ).timeLimitMinutes} phút`
                            : module.type === 'essay'
                                ? `${(module as IModuleEssay).timeLimitMinutes} phút`
                                : `${(module as IModuleSpeaking).totalMinutes} phút`
                        }
                    </span>
                </div>
            </div>

            <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={onRemove}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    defaultModules: IPlacementTestModule[];
    onNext: (modules: IPlacementTestModule[]) => void;
    onBack: () => void;
    nextLabel?: string;
    isSubmitting?: boolean;
}

type ModuleWithId = IPlacementTestModule & { id: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function Step2Structure({
    defaultModules,
    onNext,
    onBack,
    nextLabel = 'Tiếp theo →',
    isSubmitting = false,
}: Props) {
    const [modules, setModules] = useState<ModuleWithId[]>(
        defaultModules.map((m, i) => ({ ...m, id: `module-${i}` })),
    );

    // Dialog state
    const [dialogType, setDialogType] = useState<ModuleType | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setModules((prev) => {
                const oldIndex = prev.findIndex((m) => m.id === active.id);
                const newIndex = prev.findIndex((m) => m.id === over.id);
                return arrayMove(prev, oldIndex, newIndex).map((m, i) => ({ ...m, order: i + 1 }));
            });
        }
    }

    const handleSaveModule = useCallback(
        (data: IPlacementTestModule) => {
            setModules((prev) => {
                if (editingIndex !== null) {
                    const updated = [...prev];
                    updated[editingIndex] = { ...data, id: prev[editingIndex].id, order: editingIndex + 1 };
                    return updated;
                }
                const newId = `module-${Date.now()}`;
                return [...prev, { ...data, id: newId, order: prev.length + 1 }];
            });
            setDialogType(null);
            setEditingIndex(null);
        },
        [editingIndex],
    );

    function handleEdit(index: number) {
        setEditingIndex(index);
        setDialogType(modules[index].type);
    }

    function handleRemove(index: number) {
        setModules((prev) =>
            prev.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i + 1 })),
        );
    }

    function handleCancel() {
        setDialogType(null);
        setEditingIndex(null);
    }

    const editingModule = editingIndex !== null ? modules[editingIndex] : undefined;

    return (
        <div className="space-y-5">
            {/* DnD list */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={modules.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2 min-h-[4rem]">
                        {modules.length === 0 ? (
                            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                                Chưa có module nào. Thêm module đầu tiên bên dưới.
                            </div>
                        ) : (
                            modules.map((mod, idx) => (
                                <SortableItem
                                    key={mod.id}
                                    module={mod}
                                    onEdit={() => handleEdit(idx)}
                                    onRemove={() => handleRemove(idx)}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add module button */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        Thêm module
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                    <DropdownMenuItem onClick={() => setDialogType('mcq')}>
                        <BookOpen className="mr-2 h-4 w-4" /> MCQ (Trắc nghiệm)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialogType('essay')}>
                        <FileText className="mr-2 h-4 w-4" /> Writing (Tự luận)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialogType('speaking')}>
                        <Mic className="mr-2 h-4 w-4" /> Speaking (Nói)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Nav */}
            <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={onBack}>← Quay lại</Button>
                <Button
                    disabled={modules.length === 0 || isSubmitting}
                    onClick={() => onNext(modules.map(({ id: _, ...rest }) => rest as IPlacementTestModule))}
                >
                    {isSubmitting ? 'Đang lưu...' : nextLabel}
                </Button>
            </div>

            {/* Module dialog */}
            <Dialog
                open={!!dialogType}
                onOpenChange={(o) => { if (!o) handleCancel(); }}
            >
                <DialogContent className="w-[90vw] h-[88vh] max-w-[1440px] max-h-[88vh] p-6 overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingIndex !== null ? 'Chỉnh sửa' : 'Thêm'} module{' '}
                            {dialogType ? MODULE_META[dialogType].label : ''}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Form cấu hình chi tiết module, dữ liệu sẽ được lưu khi bấm nút Lưu module.
                        </DialogDescription>
                    </DialogHeader>

                    {dialogType === 'mcq' && (
                        <MCQModuleForm
                            order={editingIndex !== null ? editingIndex + 1 : modules.length + 1}
                            defaultValues={editingModule?.type === 'mcq' ? editingModule : undefined}
                            onSave={handleSaveModule}
                            onCancel={handleCancel}
                            draftKey={`placement-test:module-draft:mcq:${editingModule?.id ?? 'new'}`}
                        />
                    )}
                    {dialogType === 'essay' && (
                        <EssayModuleForm
                            order={editingIndex !== null ? editingIndex + 1 : modules.length + 1}
                            defaultValues={editingModule?.type === 'essay' ? editingModule : undefined}
                            onSave={handleSaveModule}
                            onCancel={handleCancel}
                        />
                    )}
                    {dialogType === 'speaking' && (
                        <SpeakingModuleForm
                            order={editingIndex !== null ? editingIndex + 1 : modules.length + 1}
                            defaultValues={editingModule?.type === 'speaking' ? editingModule : undefined}
                            onSave={handleSaveModule}
                            onCancel={handleCancel}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
