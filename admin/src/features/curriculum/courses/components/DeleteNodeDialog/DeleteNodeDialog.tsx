import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { StudioNodeType } from '../../stores/course-studio.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    type: StudioNodeType;
    name: string;
    isPending?: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LABELS: Record<StudioNodeType, string> = {
    course: 'Khóa học',
    unit: 'Chương',
    lesson: 'Bài học',
};

const WARNINGS: Partial<Record<StudioNodeType, string>> = {
    course: 'Xóa khóa học sẽ xóa toàn bộ chương và bài học bên trong.',
    unit: 'Xóa chương sẽ xóa toàn bộ bài học bên trong.',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DeleteNodeDialog = memo(function DeleteNodeDialog({
    open,
    type,
    name,
    isPending,
    onConfirm,
    onOpenChange,
}: Props) {
    const cascadeWarning = WARNINGS[type];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        Xóa {LABELS[type]}
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-3 pt-1 text-sm">
                            <p>
                                Bạn có chắc muốn xóa{' '}
                                <strong className="text-foreground">"{name}"</strong>?{' '}
                                Hành động này <strong>không thể hoàn tác</strong>.
                            </p>
                            {cascadeWarning && (
                                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <p>{cascadeWarning}</p>
                                </div>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                        aria-label={`Xác nhận xóa ${LABELS[type]} ${name}`}
                    >
                        {isPending ? 'Đang xóa...' : 'Xóa'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
