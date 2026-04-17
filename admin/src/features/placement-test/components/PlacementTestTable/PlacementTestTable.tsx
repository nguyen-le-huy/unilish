import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, BarChart2, History, Pause, Play, Archive, Send, Database } from 'lucide-react';
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
import { placementTestApi } from '../../api/placement-test.api';
import { PLACEMENT_TEST_QUERY_KEYS } from '../../constants/query-keys';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { usePushToQuestionBank } from '../../hooks/usePlacementTestMutations';
import type { IPlacementTestModule, IPlacementTestSummary } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    data: IPlacementTestSummary[];
    isLoading: boolean;
    onUpdateStatus: (id: string, status: 'active' | 'paused' | 'archived') => void;
    onOpenAnalytics: (id: string) => void;
    onOpenVersionHistory: (id: string) => void;
}

interface PlacementSummaryWithModules extends IPlacementTestSummary {
    modules?: IPlacementTestModule[];
}

const extractModuleNames = (modules: IPlacementTestModule[] | undefined): string[] => {
    if (!modules) return [];
    return modules
        .map((module) => module.name?.trim())
        .filter((name): name is string => Boolean(name));
};

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
    const summaryWithModules = data as PlacementSummaryWithModules[];

    const handleEdit = useCallback(
        (id: string) => navigate(`/placement-tests/${id}/edit`),
        [navigate],
    );

    const handlePublish = useCallback(
        (test: IPlacementTestSummary) => {
            onUpdateStatus(test._id, 'active');
        },
        [onUpdateStatus],
    );

    const { mutate: pushToQuestionBank, isPending: isPushing } = usePushToQuestionBank();

    const moduleDetailQueries = useQueries({
        queries: summaryWithModules.map((test) => {
            const hasInlineModules = Array.isArray(test.modules);
            const hasModuleCount = typeof test.moduleCount === 'number';

            return {
                queryKey: PLACEMENT_TEST_QUERY_KEYS.detail(test._id),
                queryFn: () => placementTestApi.getById(test._id),
                enabled: !isLoading && !hasInlineModules && !hasModuleCount,
                staleTime: 60 * 1000,
            };
        }),
    });

    const modulesByTestId = useMemo(() => {
        const result = new Map<string, { count: number; names: string[] }>();

        summaryWithModules.forEach((test, index) => {
            const inlineModules = Array.isArray(test.modules) ? test.modules : undefined;
            const detailModules = moduleDetailQueries[index]?.data?.modules;
            const modules = inlineModules ?? detailModules;

            if (modules) {
                result.set(test._id, {
                    count: modules.length,
                    names: extractModuleNames(modules),
                });
            }
        });

        return result;
    }, [summaryWithModules, moduleDetailQueries]);

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
                            : data.map((test, index) => {
                                const moduleInfo = modulesByTestId.get(test._id);
                                const moduleCount = typeof test.moduleCount === 'number'
                                    ? test.moduleCount
                                    : moduleInfo?.count;
                                const isLoadingModules = moduleDetailQueries[index]?.isFetching;

                                return (
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
                                        {isLoadingModules && moduleCount === undefined ? (
                                            <span className="text-xs text-muted-foreground">
                                                Đang tải modules...
                                            </span>
                                        ) : (
                                            <div className="flex max-w-64 flex-col gap-0.5">
                                                <span className="text-sm text-muted-foreground">
                                                    {moduleCount !== undefined ? `${moduleCount} modules` : 'Chưa có dữ liệu'}
                                                </span>
                                                {moduleInfo && moduleInfo.names.length > 0 && (
                                                    <span
                                                        className="truncate text-xs text-muted-foreground"
                                                        title={moduleInfo.names.join(', ')}
                                                    >
                                                        {moduleInfo.names.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
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
                                                {(test.status === 'draft' || test.status === 'archived') && (
                                                    <DropdownMenuItem
                                                        onClick={() => handlePublish(test)}
                                                        className="text-green-700"
                                                    >
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Công bố
                                                    </DropdownMenuItem>
                                                )}
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
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => pushToQuestionBank({ id: test._id })}
                                                    disabled={isPushing}
                                                >
                                                    <Database className="mr-2 h-4 w-4" />
                                                    Đẩy vào Question Bank
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    </TableRow>
                                );
                            })
                    }
                </TableBody>
            </Table>
        </div>
    );
}
