import { BarChart2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useExamAnalytics } from '../../hooks/useExamTestQueries';

interface Props {
    testId: string | null;
    onClose: () => void;
}

export function AnalyticsModal({ testId, onClose }: Props) {
    const open = !!testId;
    const { data, isLoading } = useExamAnalytics(testId ?? '');

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5" />
                        Analytics bài thi
                    </DialogTitle>
                    <DialogDescription>
                        Placeholder analytics cho sprint hiện tại.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="grid gap-2 pt-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                ) : (
                    <div className="rounded border bg-muted/20 p-4 text-sm">
                        {data
                            ? (
                                <div className="grid gap-2">
                                    <p>Tổng lượt thi: {data.totalAttempts ?? 0}</p>
                                    <p>Hoàn thành: {data.completedAttempts ?? 0}</p>
                                    <p>
                                        Tỷ lệ bỏ thi: {((data.dropoutRate ?? 0) * 100).toFixed(1)}%
                                    </p>
                                    <p>
                                        Thời gian trung bình: {(data.avgDurationMinutes ?? 0).toFixed(0)} phút
                                    </p>
                                </div>
                            )
                            : <p className="text-muted-foreground">Chưa có dữ liệu analytics.</p>}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
