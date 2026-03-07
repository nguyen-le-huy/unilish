import { useState } from 'react';
import { X, Trash2, CheckCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { useBulkAction } from '../../hooks/useBulkAction';
import type { BulkAction } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    selectedIds: string[];
    onClearSelection: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkActionBar({ selectedIds, onClearSelection }: Props) {
    const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
    const { mutate, isPending } = useBulkAction(onClearSelection);

    const count = selectedIds.length;
    const isVisible = count > 0;

    function handleAction(action: BulkAction) {
        if (action === 'delete') {
            setConfirmAction('delete');
        } else {
            mutate({ ids: selectedIds, action });
        }
    }

    function handleConfirm() {
        if (!confirmAction) return;
        mutate({ ids: selectedIds, action: confirmAction });
        setConfirmAction(null);
    }

    return (
        <>
            {/* Slide-up bar */}
            <div
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-in-out ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
                }`}
                aria-live="polite"
            >
                <div className="flex items-center gap-3 rounded-xl border bg-background shadow-2xl px-4 py-3">
                    {/* Count */}
                    <div className="flex items-center gap-1.5 pr-2 border-r">
                        <span className="font-semibold text-sm tabular-nums">{count}</span>
                        <span className="text-muted-foreground text-sm">đã chọn</span>
                    </div>

                    {/* Actions */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-green-700 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleAction('publish')}
                        disabled={isPending}
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Publish
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleAction('archive')}
                        disabled={isPending}
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleAction('delete')}
                        disabled={isPending}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoá
                    </Button>

                    {/* Divider */}
                    <div className="w-px h-5 bg-border" />

                    {/* Clear */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={onClearSelection}
                        aria-label="Bỏ chọn tất cả"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Confirm delete dialog */}
            <Dialog open={confirmAction === 'delete'} onOpenChange={() => setConfirmAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xoá</DialogTitle>
                        <DialogDescription>
                            Bạn sắp xoá <strong>{count}</strong> câu hỏi. Hành động này không thể hoàn tác.
                            Các câu hỏi đang ở trạng thái <em>published</em> sẽ không bị xoá.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>
                            Huỷ
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={isPending}
                        >
                            {isPending ? 'Đang xoá...' : `Xoá ${count} câu hỏi`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
