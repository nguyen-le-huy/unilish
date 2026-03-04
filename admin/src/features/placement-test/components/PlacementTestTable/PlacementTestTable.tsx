import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, BarChart2, History, Pause, Play, Archive } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import type { IPlacementTestSummary } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    data: IPlacementTestSummary[];
    isLoading: boolean;
    onUpdateStatus: (id: string, status: 'active' | 'paused' | 'archived') => void;
    onOpenAnalytics: (id: string) => void;
    onOpenVersionHistory: (id: string) => void;
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
    return (
        <TableRow key={index}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <TableRow>
            <TableCell colSpan={7} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground text-sm">Không tìm thấy bài kiểm tra nào</p>
                    <p className="text-muted-foreground text-xs">Thử thay đổi bộ lọc hoặc tạo bài kiểm tra mới</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlacementTestTable({
    data,
    isLoading,
    onUpdateStatus,
    onOpenAnalytics,
    onOpenVersionHistory,
}: Props) {
    const navigate = useNavigate();

    const handleEdit = useCallback(
        (id: string) => navigate(`/placement-tests/${id}/edit`),
        [navigate],
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tên bài kiểm tra</TableHead>
                        <TableHead>Tiêu chuẩn</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Phiên bản</TableHead>
                        <TableHead>Modules</TableHead>
                        <TableHead>Cập nhật</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow index={i} key={i} />)
                        : data.length === 0
                            ? <EmptyState />
                            : data.map((test) => (
                                <TableRow key={test._id} className="hover:bg-muted/40">
                                    {/* Name + Language */}
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-sm">{test.name}</span>
                                            <span className="text-muted-foreground text-xs uppercase tracking-wide">
                                                {test.language}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Standard */}
                                    <TableCell>
                                        <span className="text-sm">{test.standard}</span>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <StatusBadge status={test.status} />
                                    </TableCell>

                                    {/* Version */}
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            v{test.version}
                                        </Badge>
                                    </TableCell>

                                    {/* Module count */}
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {test.moduleCount ?? '—'} modules
                                        </span>
                                    </TableCell>

                                    {/* Updated at */}
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(test.updatedAt).toLocaleDateString('vi-VN')}
                                        </span>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Hành động</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => handleEdit(test._id)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Chỉnh sửa
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onOpenAnalytics(test._id)}>
                                                    <BarChart2 className="mr-2 h-4 w-4" />
                                                    Xem thống kê
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onOpenVersionHistory(test._id)}>
                                                    <History className="mr-2 h-4 w-4" />
                                                    Lịch sử phiên bản
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {test.status === 'active' ? (
                                                    <DropdownMenuItem
                                                        onClick={() => onUpdateStatus(test._id, 'paused')}
                                                        className="text-yellow-700"
                                                    >
                                                        <Pause className="mr-2 h-4 w-4" />
                                                        Tạm dừng
                                                    </DropdownMenuItem>
                                                ) : test.status === 'paused' ? (
                                                    <DropdownMenuItem
                                                        onClick={() => onUpdateStatus(test._id, 'active')}
                                                        className="text-green-700"
                                                    >
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Kích hoạt lại
                                                    </DropdownMenuItem>
                                                ) : null}
                                                {test.status !== 'archived' && (
                                                    <DropdownMenuItem
                                                        onClick={() => onUpdateStatus(test._id, 'archived')}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Lưu trữ
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                    }
                </TableBody>
            </Table>
        </div>
    );
}
