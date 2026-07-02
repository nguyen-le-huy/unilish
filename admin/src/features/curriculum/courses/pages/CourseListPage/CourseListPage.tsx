import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Plus,
    Trash2,
    ExternalLink,
    Search,
    SlidersHorizontal,
    X,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    AlertTriangle,
    ArrowUpDown,
} from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
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
import { useDebounce } from '@/hooks/useDebounce';
import { useCourses } from '../../hooks/useCourses';
import { useToggleCourseStatus, useDeleteCourse } from '../../hooks/useCourseMutations';
import { CreateCourseDrawer } from '../../components/CreateCourseDrawer/CreateCourseDrawer';
import { DeleteNodeDialog } from '../../components/DeleteNodeDialog/DeleteNodeDialog';
import { CEFR_LEVELS } from '../../types/course.types';
import type { Course } from '../../types/course.types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;
const SKELETON_ROWS = Array.from({ length: 5 }, (_, i) => i);

const CEFR_COLORS: Record<string, string> = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-emerald-100 text-emerald-700',
    B1: 'bg-blue-100 text-blue-700',
    B2: 'bg-indigo-100 text-indigo-700',
    C1: 'bg-purple-100 text-purple-700',
    C2: 'bg-red-100 text-red-700',
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'published' | 'draft';
type SortField = 'orderIndex' | 'name' | 'createdAt';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseListPage() {
    const navigate = useNavigate();

    // ── Filter & Pagination state ──────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [languageId, setLanguageId] = useState<string | undefined>(undefined);
    const [goalId, setGoalId] = useState<string | undefined>(undefined);
    const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState<SortField>('orderIndex');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const debouncedSearch = useDebounce(search, 300);

    // Reset page when filters change
    const resetPage = useCallback(() => setPage(1), []);

    // ── Language + Goal data for name resolution ──────────────────────────────
    const { data: languages = [] } = useLanguages({ isActive: true });
    const { data: goalsData } = useLearningGoals({ limit: 100, isActive: true });
    const allGoals = goalsData?.data ?? [];

    // Language lookup map
    const languageMap = useMemo(
        () => new Map(languages.map((l) => [l._id, l])),
        [languages],
    );
    // Goal lookup map
    const goalMap = useMemo(
        () => new Map(allGoals.map((g) => [g._id, g])),
        [allGoals],
    );

    // Client-side cascade: when a language is selected, only show goals that support it
    const goals = useMemo(
        () =>
            languageId
                ? allGoals.filter((g) => g.supportedLanguages.includes(languageId))
                : allGoals,
        [allGoals, languageId],
    );

    // ── Courses query ─────────────────────────────────────────────────────────
    const {
        data: courseListData,
        isLoading: isLoadingCourses,
        isError: isErrorCourses,
        error: coursesError,
        refetch: refetchCourses,
    } = useCourses({
        languageId,
        learningGoalId: goalId,
        level: levelFilter,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'published',
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        sort: sortField,
        order: sortOrder,
    });

    const courses = courseListData?.data ?? [];
    const totalPages = courseListData?.meta?.pages ?? 1;
    const totalCount = courseListData?.meta?.total ?? courses.length;

    // ── Active advanced-filter count (for badge) ──────────────────────────────
    const activeAdvancedCount = useMemo(() => {
        let n = 0;
        if (languageId) n++;
        if (goalId) n++;
        if (levelFilter) n++;
        if (statusFilter !== 'all') n++;
        return n;
    }, [languageId, goalId, levelFilter, statusFilter]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const toggleMutation = useToggleCourseStatus();
    const deleteMutation = useDeleteCourse();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLanguageChange = useCallback(
        (id: string) => {
            setLanguageId(id || undefined);
            setGoalId(undefined);
            resetPage();
            if (id) setAdvancedOpen(true);
        },
        [resetPage],
    );

    const handleGoalChange = useCallback(
        (id: string) => {
            setGoalId(id || undefined);
            resetPage();
        },
        [resetPage],
    );

    const handleLevelChange = useCallback(
        (v: string) => {
            setLevelFilter(v === 'all' ? undefined : v);
            resetPage();
        },
        [resetPage],
    );

    const handleStatusChange = useCallback(
        (v: StatusFilter) => {
            setStatusFilter(v);
            resetPage();
        },
        [resetPage],
    );

    const handleSearchChange = useCallback(
        (v: string) => {
            setSearch(v);
            resetPage();
        },
        [resetPage],
    );

    const handleResetFilters = useCallback(() => {
        setSearch('');
        setLanguageId(undefined);
        setGoalId(undefined);
        setLevelFilter(undefined);
        setStatusFilter('all');
        resetPage();
    }, [resetPage]);

    const handleSort = useCallback((field: SortField) => {
        setSortField((prev) => {
            if (prev === field) {
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setSortOrder('asc');
            return field;
        });
        resetPage();
    }, [resetPage]);

    const handleDeleteConfirm = useCallback(() => {
        if (!deleteTarget) return;
        deleteMutation.mutate(deleteTarget._id, {
            onSuccess: () => setDeleteTarget(null),
        });
    }, [deleteMutation, deleteTarget]);

    // ── Resolve display names ─────────────────────────────────────────────────
    const resolveLanguageName = useCallback(
        (id: string) => languageMap.get(id)?.name ?? id,
        [languageMap],
    );
    const resolveGoalName = useCallback(
        (id: string) => goalMap.get(id)?.title ?? id,
        [goalMap],
    );

    // ── Pagination helpers ────────────────────────────────────────────────────
    const hasPrev = page > 1;
    const hasNext = page < totalPages;

    const goToPrev = useCallback(() => {
        if (hasPrev) setPage((p) => p - 1);
    }, [hasPrev]);

    const goToNext = useCallback(() => {
        if (hasNext) setPage((p) => p + 1);
    }, [hasNext]);

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <PageHeader
                title="Khóa học (Courses)"
                description="Quản lý Course → Unit → Lesson"
            />

            {/* ── Top Toolbar ── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Tìm khóa học..."
                        className="pl-9 pr-9"
                        aria-label="Tìm kiếm khóa học"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => handleSearchChange('')}
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
                    onValueChange={handleLanguageChange}
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
                    onValueChange={handleGoalChange}
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

            {/* ── Advanced Filters (Collapsible) ── */}
            <Collapsible open={advancedOpen}>
                <CollapsibleContent id="advanced-filters-panel">
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                        {/* Status filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Trạng thái
                            </span>
                            <Select value={statusFilter} onValueChange={handleStatusChange}>
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
                            <span className="text-xs font-medium text-muted-foreground">
                                Cấp độ CEFR
                            </span>
                            <Select
                                value={levelFilter ?? 'all'}
                                onValueChange={handleLevelChange}
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
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* ── Courses table ── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {isLoadingCourses ? (
                                <Loading size="sm" className="justify-start" />
                            ) : (
                                `${totalCount} khóa học`
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* ── Error State ── */}
                    {isErrorCourses && !isLoadingCourses && (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <AlertTriangle className="h-8 w-8 text-destructive/70" aria-hidden="true" />
                            <p className="text-sm font-medium text-destructive">
                                Không thể tải danh sách khóa học
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {(coursesError as Error)?.message || 'Vui lòng thử lại sau.'}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetchCourses()}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                Thử lại
                            </Button>
                        </div>
                    )}

                    {/* ── Loading Skeleton ── */}
                    {isLoadingCourses && (
                        <div className="divide-y">
                            {SKELETON_ROWS.map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 px-6 py-4"
                                >
                                    <Skeleton className="h-5 w-10 rounded-full" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="ml-auto h-8 w-24" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Empty State ── */}
                    {!isLoadingCourses && !isErrorCourses && courses.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-16">
                            <BookOpen
                                className="h-10 w-10 text-muted-foreground/40"
                                aria-hidden="true"
                            />
                            <div className="text-center">
                                <p className="text-sm font-medium">Chưa có khóa học nào</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Nhấn nút bên dưới để tạo course đầu tiên.
                                </p>
                            </div>
                            <Button size="sm" onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                Thêm khóa học đầu tiên
                            </Button>
                        </div>
                    )}

                    {/* ── Data Table ── */}
                    {!isLoadingCourses && !isErrorCourses && courses.length > 0 && (
                        <>
                            {/* Sort header row */}
                            <div className="hidden md:flex items-center gap-3 border-b bg-muted/40 px-6 py-2 text-xs font-medium text-muted-foreground">
                                <span className="w-14 shrink-0">CEFR</span>
                                <button
                                    type="button"
                                    onClick={() => handleSort('name')}
                                    className="flex flex-1 min-w-0 items-center gap-1 hover:text-foreground transition-colors"
                                >
                                    Tên khóa học
                                    <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                                </button>
                                <span className="w-32 shrink-0">Ngôn ngữ</span>
                                <span className="w-36 shrink-0">Mục tiêu</span>
                                <span className="w-12 shrink-0 text-center">Units</span>
                                <span className="ml-auto w-40 shrink-0 text-right">Hành động</span>
                            </div>

                            {/* Table rows */}
                            <div className="divide-y">
                                {courses.map((course) => (
                                    <div
                                        key={course._id}
                                        className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 hover:bg-muted/30 transition-colors"
                                    >
                                        {/* Mobile: compact row */}
                                        <div className="flex md:hidden items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`shrink-0 text-xs ${CEFR_COLORS[course.level] ?? ''}`}
                                            >
                                                {course.level}
                                            </Badge>
                                            <span className="truncate font-medium text-sm flex-1">
                                                {course.name}
                                            </span>
                                            <Switch
                                                checked={course.isActive}
                                                onCheckedChange={() =>
                                                    toggleMutation.mutate(course._id)
                                                }
                                                aria-label={`Toggle ${course.name}`}
                                                disabled={toggleMutation.isPending}
                                            />
                                        </div>

                                        {/* Mobile: secondary info */}
                                        <div className="flex md:hidden items-center gap-2 text-xs text-muted-foreground">
                                            <span>{resolveLanguageName(course.languageId)}</span>
                                            <span>·</span>
                                            <span>{resolveGoalName(course.learningGoalId)}</span>
                                            <span>·</span>
                                            <span>{course.totalUnits} units</span>
                                        </div>

                                        {/* Mobile: actions */}
                                        <div className="flex md:hidden items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    navigate(
                                                        `/curriculum/courses/${course._id}/studio`,
                                                    )
                                                }
                                                className="h-7 text-xs px-2"
                                            >
                                                <ExternalLink className="mr-1 h-3 w-3" />
                                                Studio
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => setDeleteTarget(course)}
                                                aria-label={`Xóa ${course.name}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>

                                        {/* Desktop: full row */}
                                        <Badge
                                            variant="outline"
                                            className={`hidden md:inline-flex shrink-0 w-14 justify-center ${CEFR_COLORS[course.level] ?? ''}`}
                                        >
                                            {course.level}
                                        </Badge>

                                        <div className="hidden md:block flex-1 min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {course.name}
                                            </p>
                                        </div>

                                        <span className="hidden md:block w-32 shrink-0 text-xs text-muted-foreground truncate">
                                            {resolveLanguageName(course.languageId)}
                                        </span>

                                        <span className="hidden md:block w-36 shrink-0 text-xs text-muted-foreground truncate">
                                            {resolveGoalName(course.learningGoalId)}
                                        </span>

                                        <span className="hidden md:block w-12 shrink-0 text-center text-sm font-semibold tabular-nums text-foreground">
                                            {Number.isFinite(course.totalUnits) ? course.totalUnits : 0}
                                        </span>

                                        <div className="hidden md:flex ml-auto w-40 shrink-0 items-center justify-end gap-1">
                                            <Switch
                                                checked={course.isActive}
                                                onCheckedChange={() =>
                                                    toggleMutation.mutate(course._id)
                                                }
                                                aria-label={`Toggle ${course.name}`}
                                                disabled={toggleMutation.isPending}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    navigate(
                                                        `/curriculum/courses/${course._id}/studio`,
                                                    )
                                                }
                                                className="h-7 text-xs px-2"
                                            >
                                                <ExternalLink className="mr-1 h-3 w-3" />
                                                Studio
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => setDeleteTarget(course)}
                                                aria-label={`Xóa ${course.name}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Pagination ── */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t px-6 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        Trang {page} / {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToPrev}
                                            disabled={!hasPrev}
                                            aria-label="Trang trước"
                                        >
                                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToNext}
                                            disabled={!hasNext}
                                            aria-label="Trang sau"
                                        >
                                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── Create Course Drawer ── */}
            <CreateCourseDrawer
                open={createOpen}
                onOpenChange={setCreateOpen}
                defaultLanguageId={languageId}
                defaultLearningGoalId={goalId}
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
