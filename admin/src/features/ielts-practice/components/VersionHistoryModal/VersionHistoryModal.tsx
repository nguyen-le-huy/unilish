import { History, RotateCcw } from 'lucide-react';
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
import { IeltsStatusBadge } from '../StatusBadge/StatusBadge';
import { useIeltsPracticeVersionHistory } from '../../hooks/use-ielts-practice-tests';
import { useRollbackIeltsPractice } from '../../hooks/use-ielts-practice-mutations';

interface Props {
  testId: string | null;
  onClose: () => void;
}

export function VersionHistoryModal({ testId, onClose }: Props) {
  const open = !!testId;
  const { data: history, isLoading } = useIeltsPracticeVersionHistory(testId ?? '');
  const { mutate: rollback, isPending: isRollingBack } = useRollbackIeltsPractice();

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
            Xem và khôi phục các phiên bản trước của đề luyện IELTS.
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
                        <IeltsStatusBadge status={item.status} />
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
                            <RotateCcw className="h-3 w-3" />
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {history && history.length === 0 && !isLoading && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Chưa có lịch sử phiên bản.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
