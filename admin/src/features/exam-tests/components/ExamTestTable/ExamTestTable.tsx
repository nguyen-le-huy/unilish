import { useNavigate } from 'react-router-dom';
import { Archive, BarChart2, History, MoreHorizontal, Pause, Pencil, Play } from 'lucide-react';
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
import { FormatBadge } from '../FormatBadge/FormatBadge';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import type { IExamTestSummary } from '../../types';

interface ExamTestTableProps {
    data: IExamTestSummary[];
    isLoading: boolean;
    onUpdateStatus: (id: string, status: 'active' | 'paused' | 'archived') => void;
    onOpenVersionHistory: (id: string) => void;
    onOpenAnalytics: (id: string) => void;
}

function SkeletonRow({ index }: { index: number }) {
    return (
        <TableRow key={index}>
            <TableCell><Skeleton className="h-4 w-44" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
    );
}

export function ExamTestTable({
    data,
    isLoading,
    onUpdateStatus,
    onOpenVersionHistory,
    onOpenAnalytics,
}: ExamTestTableProps) {
    const navigate = useNavigate();

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tên bài thi</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Ngôn ngữ</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Phiên bản</TableHead>
                        <TableHead>Cập nhật</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                        : data.length === 0
                            ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-36 text-center">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-muted-foreground">
                                                Chưa có bài thi phù hợp
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Thử đổi bộ lọc hoặc tạo bài thi mới.
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                            : data.map((test) => (
                                <TableRow key={test._id} className="hover:bg-muted/40">
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium">{test.name}</span>
                                            {test.description && (
                                                <span className="line-clamp-1 text-xs text-muted-foreground">
                                                    {test.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <FormatBadge format={test.format} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {test.language}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={test.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            v{test.version}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(test.updatedAt).toLocaleDateString('vi-VN')}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Hành động</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem
                                                    onClick={() => navigate(`/exam-tests/${test._id}/edit`)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Chỉnh sửa
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onOpenVersionHistory(test._id)}>
                                                    <History className="mr-2 h-4 w-4" />
                                                    Lịch sử phiên bản
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onOpenAnalytics(test._id)}>
                                                    <BarChart2 className="mr-2 h-4 w-4" />
                                                    Analytics
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {(test.status === 'draft'
                                                    || test.status === 'paused'
                                                    || test.status === 'archived') && (
                                                    <DropdownMenuItem
                                                        onClick={() => onUpdateStatus(test._id, 'active')}
                                                        className="text-green-700 focus:text-green-700"
                                                    >
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Kích hoạt
                                                    </DropdownMenuItem>
                                                )}
                                                {test.status === 'active' && (
                                                    <DropdownMenuItem
                                                        onClick={() => onUpdateStatus(test._id, 'paused')}
                                                        className="text-yellow-700 focus:text-yellow-700"
                                                    >
                                                        <Pause className="mr-2 h-4 w-4" />
                                                        Tạm dừng
                                                    </DropdownMenuItem>
                                                )}
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
