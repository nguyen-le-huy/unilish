import { History, RotateCcw, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useVersionHistory } from '../../hooks/usePlacementTestQueries';
import { useRollbackPlacementTest } from '../../hooks/usePlacementTestMutations';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    testId: string | null;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VersionHistoryModal({ testId, onClose }: Props) {
    const open = !!testId;
    const { data: history, isLoading } = useVersionHistory(testId ?? '');
    const { mutate: rollback, isPending: isRollingBack } = useRollbackPlacementTest();

    function handleRollback(version: number) {
        if (!testId) return;
        rollback({ id: testId, version }, { onSuccess: onClose });
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Lịch sử phiên bản
                    </DialogTitle>
                    <DialogDescription>
                        Xem và khôi phục các phiên bản trước của bài kiểm tra.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Phiên bản</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead>Cập nhật bởi</TableHead>
                                <TableHead className="w-28" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading
                                ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 5 }).map((__, j) => (
                                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                                : (history ?? []).map((item) => (
                                    <TableRow key={item._id}>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                v{item.version}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={item.status} />
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {item.updatedBy ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {item.status === 'archived' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isRollingBack}
                                                    onClick={() => handleRollback(item.version)}
                                                    className="gap-1.5 text-xs"
                                                >
                                                    {isRollingBack ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="h-3 w-3" />
                                                    )}
                                                    Khôi phục
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
