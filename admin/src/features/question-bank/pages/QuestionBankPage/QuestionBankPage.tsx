import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { QuestionTable } from '../../components/QuestionTable/QuestionTable';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import { BulkActionBar } from '../../components/BulkActionBar/BulkActionBar';
import { useQuestionsQuery } from '../../hooks/useQuestionsQuery';
import { useDeleteQuestion, useUpdateQuestionStatus } from '../../hooks/useQuestionMutations';
import { useExportQuestions } from '../../hooks/useBulkAction';
import type { IQuestionFilters, IQuestion, QuestionStatus } from '../../types';
import type { SortConfig } from '../../components/QuestionTable/columns';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
    const navigate = useNavigate();

    // ── Filters ───────────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);
    const [filters, setFilters] = useState<IQuestionFilters>({ page: 1, limit: PAGE_SIZE });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // ── Sort ──────────────────────────────────────────────────────────────────
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'updatedAt', order: 'desc' });

    // ── Selection ────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Delete confirm ────────────────────────────────────────────────────────
    const [questionToDelete, setQuestionToDelete] = useState<IQuestion | null>(null);

    // ── Merged query params ────────────────────────────────────────────────────
    const queryFilters = useMemo<IQuestionFilters>(
        () => ({
            ...filters,
            search: debouncedSearch || undefined,
            sortBy: sortConfig.field as IQuestionFilters['sortBy'],
            sortOrder: sortConfig.order,
        }),
        [filters, debouncedSearch, sortConfig],
    );

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data, isLoading } = useQuestionsQuery(queryFilters);
    const { mutate: deleteQuestion, isPending: isDeleting } = useDeleteQuestion();
    const { mutate: updateStatus } = useUpdateQuestionStatus();
    const { mutate: exportQuestions, isPending: isExporting } = useExportQuestions();

    // ── Handlers ──────────────────────────────────────────────────────────────

    function handleSort(field: string) {
        setSortConfig((prev) => ({
            field,
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
        }));
    }

    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }, []);

    const handleToggleSelectAll = useCallback((ids: string[]) => {
        setSelectedIds((prev) => {
            if (ids.length > 0 && ids.every((id) => prev.includes(id))) {
                return prev.filter((id) => !ids.includes(id));
            }
            return [...new Set([...prev, ...ids])];
        });
    }, []);

    function handleFiltersChange(newFilters: IQuestionFilters) {
        setFilters({ ...newFilters, page: 1, limit: PAGE_SIZE });
        setSelectedIds([]);
    }

    function handlePageChange(newPage: number) {
        setFilters((prev) => ({ ...prev, page: newPage }));
    }

    function handleView(question: IQuestion) {
        navigate(`/questions/${question._id}/edit`);
    }

    function handleEdit(question: IQuestion) {
        navigate(`/questions/${question._id}/edit`);
    }

    function handleArchive(question: IQuestion) {
        updateStatus(
            { id: question._id, payload: { status: 'archived' as QuestionStatus } },
            { onSuccess: () => toast.success('Đã archive câu hỏi') },
        );
    }

    function handleConfirmDelete() {
        if (!questionToDelete) return;
        deleteQuestion(questionToDelete._id, {
            onSuccess: () => setQuestionToDelete(null),
        });
    }

    function handleExport() {
        // Export with current filters (minus pagination)
        const { page: _p, limit: _l, ...exportFilters } = queryFilters;
        exportQuestions({ filters: exportFilters, format: 'csv' });
    }

    // ── Active filter count ────────────────────────────────────────────────────
    const activeFilterCount = useMemo(() => {
        return [
            (filters.source?.length ?? 0) > 0,
            (filters.skill?.length ?? 0) > 0,
            (filters.difficulty?.length ?? 0) > 0,
            (filters.status?.length ?? 0) > 0,
        ].filter(Boolean).length;
    }, [filters]);

    const questions = data?.data ?? [];
    const totalPages = data?.totalPages ?? 1;
    const currentPage = filters.page ?? 1;
    const total = data?.total ?? 0;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <PageHeader
                title="Ngân hàng Câu hỏi"
                description={`${total.toLocaleString()} câu hỏi`}
            >
                <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
                </Button>
                <Button size="sm" onClick={() => navigate('/questions/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo câu hỏi
                </Button>
            </PageHeader>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setFilters((prev) => ({ ...prev, page: 1 }));
                        }}
                        placeholder="Tìm câu hỏi..."
                        className="pl-9"
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="relative"
                    onClick={() => setIsFilterOpen(true)}
                >
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Bộ lọc
                    {activeFilterCount > 0 && (
                        <Badge
                            variant="default"
                            className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                        >
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Table */}
            <QuestionTable
                data={questions}
                isLoading={isLoading}
                selectedIds={selectedIds}
                sortConfig={sortConfig}
                onSort={handleSort}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onView={handleView}
                onEdit={handleEdit}
                onArchive={handleArchive}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Trang {currentPage} / {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Trước
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || isLoading}
                        >
                            Sau
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Filter panel (sheet) */}
            <FilterPanel
                isOpen={isFilterOpen}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClose={() => setIsFilterOpen(false)}
            />

            {/* Bulk action bar */}
            <BulkActionBar
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds([])}
            />

            {/* Single delete confirm */}
            <Dialog
                open={!!questionToDelete}
                onOpenChange={(open) => !open && setQuestionToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xoá câu hỏi</DialogTitle>
                        <DialogDescription>
                            Câu hỏi này sẽ bị xoá vĩnh viễn. Hành động không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQuestionToDelete(null)}>
                            Huỷ
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Đang xoá...' : 'Xoá'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
