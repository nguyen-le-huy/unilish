import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { PlacementTestTable } from '../../components/PlacementTestTable/PlacementTestTable';
import { VersionHistoryModal } from '../../components/VersionHistoryModal/VersionHistoryModal';
import { AnalyticsModal } from '../../components/AnalyticsModal/AnalyticsModal';
import { usePlacementTests } from '../../hooks/usePlacementTests';
import { useUpdatePlacementTestStatus } from '../../hooks/usePlacementTestMutations';
import type { IPlacementTestFilters, PlacementTestStatus } from '../../types';
import { PLACEMENT_STATUS_LABELS } from '../../constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlacementTestListPage() {
    const navigate = useNavigate();

    // ── Filters ───────────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);
    const [statusFilter, setStatusFilter] = useState<PlacementTestStatus | 'all'>('all');
    const [page, setPage] = useState(1);

    // ── Modal state ────────────────────────────────────────────────────────────
    const [analyticsTestId, setAnalyticsTestId] = useState<string | null>(null);
    const [historyTestId, setHistoryTestId] = useState<string | null>(null);

    // ── Query params ───────────────────────────────────────────────────────────
    const queryFilters = useMemo<IPlacementTestFilters>(
        () => ({
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        [page, debouncedSearch, statusFilter],
    );

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data, isLoading } = usePlacementTests(queryFilters);
    const { mutate: updateStatus } = useUpdatePlacementTestStatus();

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleStatusChange = useCallback(
        (id: string, status: 'active' | 'paused' | 'archived') => {
            updateStatus({ id, status });
        },
        [updateStatus],
    );

    const totalPages = data?.totalPages ?? 1;

    return (
        <div className="flex flex-col gap-6 p-6">
            <PageHeader
                title="Bài Kiểm tra Đầu vào"
                description="Quản lý bài kiểm tra xếp lớp đầu vào theo ngôn ngữ và tiêu chuẩn."
            >
                <Button onClick={() => navigate('/placement-tests/create')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Tạo bài kiểm tra
                </Button>
            </PageHeader>

            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Tìm tên bài kiểm tra…"
                        className="pl-9"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                        setStatusFilter(v as typeof statusFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {(Object.entries(PLACEMENT_STATUS_LABELS) as [PlacementTestStatus, string][]).map(
                            ([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <PlacementTestTable
                data={data?.data ?? []}
                isLoading={isLoading}
                onUpdateStatus={handleStatusChange}
                onOpenAnalytics={setAnalyticsTestId}
                onOpenVersionHistory={setHistoryTestId}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Trang {page} / {totalPages} · {data?.total ?? 0} bài kiểm tra
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AnalyticsModal testId={analyticsTestId} onClose={() => setAnalyticsTestId(null)} />
            <VersionHistoryModal testId={historyTestId} onClose={() => setHistoryTestId(null)} />
        </div>
    );
}
