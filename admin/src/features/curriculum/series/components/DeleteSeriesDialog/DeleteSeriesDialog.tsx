import { memo, useCallback } from 'react';
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
import type { CourseSeries } from '../../types/course-series.types';

interface DeleteSeriesDialogProps {
    isOpen: boolean;
    series: CourseSeries | null;
    onClose: () => void;
    onConfirm: (slug: string) => void;
    isPending: boolean;
}

export const DeleteSeriesDialog = memo(function DeleteSeriesDialog({
    isOpen,
    series,
    onClose,
    onConfirm,
    isPending,
}: DeleteSeriesDialogProps) {
    const handleConfirm = useCallback(() => {
        if (series) onConfirm(series.slug);
    }, [series, onConfirm]);

    if (!series) return null;

    const hasBlockingCourses = series.totalCourses > 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        Xóa Course Series
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-3 pt-1 text-sm">
                            <p>
                                Bạn có chắc muốn xóa series{' '}
                                <strong className="text-foreground">"{series.title}"</strong>?
                                Hành động này <strong>không thể hoàn tác</strong>.
                            </p>

                            {hasBlockingCourses && (
                                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <p>
                                        Series này còn{' '}
                                        <strong>{series.totalCourses} khóa học</strong>. Hãy xóa hoặc
                                        di chuyển toàn bộ khóa học trước khi xóa series.
                                    </p>
                                </div>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isPending}
                        aria-label="Hủy bỏ"
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isPending || hasBlockingCourses}
                        aria-label={`Xác nhận xóa series ${series.title}`}
                    >
                        {isPending ? 'Đang xóa...' : 'Xóa series'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
