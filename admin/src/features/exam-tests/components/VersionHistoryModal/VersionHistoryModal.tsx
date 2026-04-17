import { History, Loader2, RotateCcw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { useRollbackExamTest } from '../../hooks/useExamTestMutations';
import { useExamVersionHistory } from '../../hooks/useExamTestQueries';

interface Props {
    testId: string | null;
    onClose: () => void;
}

export function VersionHistoryModal({ testId, onClose }: Props) {
    const open = !!testId;
    const { data: versions, isLoading } = useExamVersionHistory(testId ?? '');
    const { mutate: rollback, isPending } = useRollbackExamTest();

    const handleRollback = (version: number) => {
        if (!testId) {
            return;
        }
        rollback(
            { id: testId, version },
            {
                onSuccess: onClose,
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Lịch sử phiên bản
                    </DialogTitle>
                    <DialogDescription>
                        Placeholder version history cho sprint hiện tại.
                    </DialogDescription>
                </DialogHeader>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Phiên bản</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày cập nhật</TableHead>
                            <TableHead className="w-28" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                                </TableRow>
                            ))
                            : (versions ?? []).length === 0
                                ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                                            Chưa có dữ liệu phiên bản.
                                        </TableCell>
                                    </TableRow>
                                )
                                : (versions ?? []).map((item) => (
                                    <TableRow key={item._id}>
                                        <TableCell className="font-mono text-xs">v{item.version}</TableCell>
                                        <TableCell><StatusBadge status={item.status} /></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(item.updatedAt).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                disabled={isPending}
                                                onClick={() => handleRollback(item.version)}
                                            >
                                                {isPending ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="h-3 w-3" />
                                                )}
                                                Rollback
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
            </DialogContent>
        </Dialog>
    );
}
