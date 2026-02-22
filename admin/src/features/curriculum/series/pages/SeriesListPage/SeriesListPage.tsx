import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { SeriesCard } from '../../components/SeriesCard/SeriesCard';
import { SeriesFilters } from '../../components/SeriesFilters/SeriesFilters';
import { DeleteSeriesDialog } from '../../components/DeleteSeriesDialog/DeleteSeriesDialog';
import { useSeriesList } from '../../hooks/useCourseSeries';
import { useDeleteSeries, useToggleSeriesStatus } from '../../hooks/useCourseSeriesMutations';
import type { CourseSeries } from '../../types/course-series.types';

const SKELETON_CARDS = Array.from({ length: 6 }, (_, i) => i);

export default function SeriesListPage() {
    const navigate = useNavigate();

    // ── Filter state ──────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [languageId, setLanguageId] = useState<string | undefined>(undefined);
    const [learningGoalId, setLearningGoalId] = useState<string | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<CourseSeries | null>(null);

    const debouncedSearch = useDebounce(search, 300);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data, isLoading } = useSeriesList({
        page: 1,
        limit: 24,
        search: debouncedSearch || undefined,
        languageId,
        learningGoalId,
    });

    const series = data?.data ?? [];

    // ── Mutations ─────────────────────────────────────────────────────────────
    const toggleMutation = useToggleSeriesStatus();
    const deleteMutation = useDeleteSeries();

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleDeleteConfirm = useCallback(
        (slug: string) => {
            deleteMutation.mutate(slug, { onSettled: () => setDeleteTarget(null) });
        },
        [deleteMutation],
    );

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageHeader
                    title="Bộ khóa học (Series)"
                    description="Quản lý các series ngôn ngữ — gom nhóm courses từ A1 đến C2"
                />
                <Button
                    onClick={() => navigate('/curriculum/series/new')}
                    aria-label="Tạo bộ khóa học mới"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo series mới
                </Button>
            </div>

            {/* ── Toolbar: search + filters ── */}
            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc slug..."
                    className="max-w-xs"
                    aria-label="Tìm kiếm series"
                />
                <SeriesFilters
                    languageId={languageId}
                    learningGoalId={learningGoalId}
                    onLanguageChange={setLanguageId}
                    onGoalChange={setLearningGoalId}
                />
            </div>

            {/* ── Content ── */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {SKELETON_CARDS.map((i) => (
                        <Skeleton key={i} className="h-64 w-full rounded-lg" />
                    ))}
                </div>
            ) : series.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <BookOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                        <EmptyTitle>Chưa có series nào</EmptyTitle>
                    </EmptyHeader>
                    <p className="text-sm text-muted-foreground">
                        {debouncedSearch || languageId || learningGoalId
                            ? 'Không tìm thấy kết quả phù hợp với bộ lọc hiện tại.'
                            : 'Tạo series đầu tiên để bắt đầu quản lý nội dung.'}
                    </p>
                    {!debouncedSearch && !languageId && !learningGoalId && (
                        <Button onClick={() => navigate('/curriculum/series/new')} aria-label="Tạo series đầu tiên">
                            <Plus className="mr-2 h-4 w-4" />
                            Tạo series đầu tiên
                        </Button>
                    )}
                </Empty>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {series.map((s) => (
                        <SeriesCard
                            key={s._id}
                            series={s}
                            onToggleStatus={(slug) => toggleMutation.mutate(slug)}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            {/* ── Delete dialog ── */}
            <DeleteSeriesDialog
                isOpen={Boolean(deleteTarget)}
                series={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
