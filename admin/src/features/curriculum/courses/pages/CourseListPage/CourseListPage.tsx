import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, Trash2, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
// Cross-feature imports via public barrels (FSD §2)
import { useLanguages } from '@/features/curriculum/languages';
import { useLearningGoals } from '@/features/curriculum/goals';
import { useSeriesList } from '@/features/curriculum/series';
import { useDebounce } from '@/hooks/useDebounce';
import { useCoursesBySeriesId } from '../../hooks/useCourses';
import { useToggleCourseStatus, useDeleteCourse } from '../../hooks/useCourseMutations';
import { CreateCourseDrawer } from '../../components/CreateCourseDrawer/CreateCourseDrawer';
import { DeleteNodeDialog } from '../../components/DeleteNodeDialog/DeleteNodeDialog';
import { CEFR_LEVELS } from '../../types/course.types';
import type { Course } from '../../types/course.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKELETON_ROWS = Array.from({ length: 5 }, (_, i) => i);

const CEFR_COLORS: Record<string, string> = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-emerald-100 text-emerald-700',
    B1: 'bg-blue-100 text-blue-700',
    B2: 'bg-indigo-100 text-indigo-700',
    C1: 'bg-purple-100 text-purple-700',
    C2: 'bg-red-100 text-red-700',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'published' | 'draft';

export default function CourseListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const seriesId = searchParams.get('seriesId') ?? '';

    // ── Filter state ──────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [languageId, setLanguageId] = useState<string | undefined>(undefined);
    const [goalId, setGoalId] = useState<string | undefined>(undefined);
    const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const debouncedSearch = useDebounce(search, 300);

    // ── Language + Goal data for cascade ──────────────────────────────────────
    const { data: languages = [] } = useLanguages({ isActive: true });
    const { data: goalsData } = useLearningGoals({ limit: 100, isActive: true });
    const allGoals = goalsData?.data ?? [];
    // Client-side cascade: when a language is selected, only show goals that support it
    const goals = useMemo(
        () =>
            languageId
                ? allGoals.filter((g) => g.supportedLanguages.includes(languageId))
                : allGoals,
        [allGoals, languageId],
    );

    // ── Series filtered by language + goal (cascade) ──────────────────────────
    const { data: seriesData, isLoading: isLoadingSeries } = useSeriesList({
        limit: 100,
        ...(languageId ? { languageId } : {}),
        ...(goalId ? { learningGoalId: goalId } : {}),
    });
    const allSeries = seriesData?.data ?? [];

    // Ensure selected series is still in the filtered list; reset if not
    const activeSeries = allSeries.find((s) => s._id === seriesId) ?? null;

    // ── Courses in the selected series ────────────────────────────────────────
    const { data: allCourses = [], isLoading: isLoadingCourses } = useCoursesBySeriesId(
        { seriesId },
    );

    // ── Client-side derived filtering ─────────────────────────────────────────
    const courses = useMemo(() => {
        return allCourses
            .filter((c) =>
                !debouncedSearch ||
                c.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
            )
            .filter((c) => !levelFilter || c.level === levelFilter)
            .filter((c) => {
                if (statusFilter === 'published') return c.isActive;
                if (statusFilter === 'draft') return !c.isActive;
                return true;
            });
    }, [allCourses, debouncedSearch, levelFilter, statusFilter]);

    // ── Active advanced-filter count (for badge) ──────────────────────────────
    const activeAdvancedCount = useMemo(() => {
        let n = 0;
        if (seriesId) n++;
        if (levelFilter) n++;
        if (statusFilter !== 'all') n++;
        return n;
    }, [seriesId, levelFilter, statusFilter]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const toggleMutation = useToggleCourseStatus();
    const deleteMutation = useDeleteCourse();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

    const handleSeriesChange = useCallback(
        (id: string) => setSearchParams(id ? { seriesId: id } : {}),
        [setSearchParams],
    );

    const handleLanguageChange = useCallback((id: string) => {
        setLanguageId(id || undefined);
        setGoalId(undefined);
        setSearchParams({});
        // Auto-open advanced panel so the Series selector is immediately visible
        if (id) setAdvancedOpen(true);
    }, [setSearchParams]);

    const handleGoalChange = useCallback((id: string) => {
        setGoalId(id || undefined);
        setSearchParams({});
        // Auto-open advanced panel so the user can pick a filtered series right away
        if (id) setAdvancedOpen(true);
    }, [setSearchParams]);

    const handleResetFilters = useCallback(() => {
        setSearch('');
        setLanguageId(undefined);
        setGoalId(undefined);
        setLevelFilter(undefined);
        setStatusFilter('all');
        setSearchParams({});
    }, [setSearchParams]);

    const handleDeleteConfirm = useCallback(() => {
        if (!deleteTarget) return;
        deleteMutation.mutate(deleteTarget._id, {
            onSuccess: () => setDeleteTarget(null),
        });
    }, [deleteMutation, deleteTarget]);

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <PageHeader
                title="Khóa học (Courses)"
                description="Quản lý Course → Unit → Lesson"
            />

            {/* ── Row 1: Top Toolbar ── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm khóa học..."
                        className="pl-9 pr-9"
                        aria-label="Tìm kiếm khóa học"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Xóa tìm kiếm"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {/* Language cascade filter */}
                <Select
                    value={languageId ?? 'all'}
                    onValueChange={(v) => handleLanguageChange(v === 'all' ? '' : v)}
                >
                    <SelectTrigger className="w-[150px]" aria-label="Lọc theo ngôn ngữ">
                        <SelectValue placeholder="Ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả ngôn ngữ</SelectItem>
                        {languages.map((lang) => (
                            <SelectItem key={lang._id} value={lang._id}>
                                {lang.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Learning Goal cascade filter */}
                <Select
                    value={goalId ?? 'all'}
                    onValueChange={(v) => handleGoalChange(v === 'all' ? '' : v)}
                >
                    <SelectTrigger className="w-[170px]" aria-label="Lọc theo mục tiêu">
                        <SelectValue placeholder="Mục tiêu" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả mục tiêu</SelectItem>
                        {goals.map((goal) => (
                            <SelectItem key={goal._id} value={goal._id}>
                                {goal.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Advanced Filters toggle */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdvancedOpen((prev) => !prev)}
                    aria-expanded={advancedOpen}
                    aria-controls="advanced-filters-panel"
                    className="gap-2"
                >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Bộ lọc nâng cao
                    {activeAdvancedCount > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                            {activeAdvancedCount}
                        </Badge>
                    )}
                </Button>

                <div className="ml-auto">
                    <Button
                        onClick={() => setCreateOpen(true)}
                        aria-label="Tạo khóa học mới"
                    >
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Thêm khóa học
                    </Button>
                </div>
            </div>

            {/* ── Row 2: Advanced Filters (Collapsible) ── */}
            <Collapsible open={advancedOpen}>
                <CollapsibleContent id="advanced-filters-panel">
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                        {/* Series selector (moved here) */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Series</span>
                            <Select
                                value={seriesId || 'all'}
                                onValueChange={(v) => handleSeriesChange(v === 'all' ? '' : v)}
                                disabled={isLoadingSeries}
                            >
                                <SelectTrigger className="w-[220px]" aria-label="Chọn series">
                                    <SelectValue
                                        placeholder={isLoadingSeries ? 'Đang tải...' : 'Chọn một series...'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả series</SelectItem>
                                    {allSeries.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator orientation="vertical" className="mx-1 h-8 hidden sm:block" />

                        {/* Status filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Trạng thái</span>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                            >
                                <SelectTrigger className="w-[150px]" aria-label="Lọc theo trạng thái">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="published">Đã xuất bản</SelectItem>
                                    <SelectItem value="draft">Bản nháp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* CEFR Level filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Cấp độ CEFR</span>
                            <Select
                                value={levelFilter ?? 'all'}
                                onValueChange={(v) => setLevelFilter(v === 'all' ? undefined : v)}
                            >
                                <SelectTrigger className="w-[130px]" aria-label="Lọc theo cấp độ CEFR">
                                    <SelectValue placeholder="Tất cả" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    {CEFR_LEVELS.map((lvl) => (
                                        <SelectItem key={lvl} value={lvl}>
                                            {lvl}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reset button */}
                        {activeAdvancedCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="gap-1.5 text-muted-foreground hover:text-foreground self-end"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                Đặt lại
                            </Button>
                        )}

                        {activeSeries && (
                            <span className="self-end pb-1 text-xs text-muted-foreground">
                                /{activeSeries.slug}
                            </span>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* ── No series selected ── */}
            {!seriesId ? (
                <Empty>
                    <EmptyHeader>
                        <BookOpen className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                        <EmptyTitle>Chưa chọn Series</EmptyTitle>
                    </EmptyHeader>
                    <p className="text-sm text-muted-foreground">
                        Mở{' '}
                        <button
                            type="button"
                            className="font-medium underline underline-offset-2 hover:text-foreground"
                            onClick={() => setAdvancedOpen(true)}
                        >
                            Bộ lọc nâng cao
                        </button>{' '}
                        và chọn một Series để xem các khóa học bên trong.
                    </p>
                </Empty>
            ) : (
                /* ── Courses table ── */
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {isLoadingCourses
                                ? 'Đang tải...'
                                : `${courses.length} / ${allCourses.length} khóa học`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingCourses ? (
                            <div className="divide-y">
                                {SKELETON_ROWS.map((i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-5 w-10 rounded-full" />
                                        <Skeleton className="ml-auto h-8 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : courses.length === 0 ? (
                            <div className="flex flex-col items-center gap-4 py-12">
                                <BookOpen className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                                <div className="text-center">
                                    {allCourses.length > 0 ? (
                                        <>
                                            <p className="text-sm font-medium">Không có kết quả phù hợp</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium">Series này chưa có khóa học nào</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Nhấn nút bên dưới để tạo course đầu tiên.
                                            </p>
                                        </>
                                    )}
                                </div>
                                {allCourses.length === 0 && (
                                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                        Thêm khóa học đầu tiên
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {courses.map((course) => (
                                    <div
                                        key={course._id}
                                        className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <Badge
                                            variant="outline"
                                            className={`shrink-0 ${CEFR_COLORS[course.level] ?? ''}`}
                                        >
                                            {course.level}
                                        </Badge>

                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium">{course.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {course.totalUnits} units · order #{course.orderInSeries}
                                            </p>
                                        </div>

                                        <Switch
                                            checked={course.isActive}
                                            onCheckedChange={() => toggleMutation.mutate(course._id)}
                                            aria-label={`Toggle ${course.name}`}
                                            disabled={toggleMutation.isPending}
                                        />

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/curriculum/courses/${course._id}/studio`)}
                                            aria-label={`Mở Studio cho ${course.name}`}
                                        >
                                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                            Studio
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setDeleteTarget(course)}
                                            aria-label={`Xóa ${course.name}`}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Create Course Drawer (Slide-over) ── */}
            <CreateCourseDrawer
                open={createOpen}
                onOpenChange={setCreateOpen}
                defaultSeriesId={seriesId || undefined}
            />

            {/* ── Delete Confirmation ── */}
            {deleteTarget && (
                <DeleteNodeDialog
                    open={!!deleteTarget}
                    type="course"
                    name={deleteTarget.name}
                    isPending={deleteMutation.isPending}
                    onConfirm={handleDeleteConfirm}
                    onOpenChange={(open) => !open && setDeleteTarget(null)}
                />
            )}
        </div>
    );
}