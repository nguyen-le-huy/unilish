import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
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
import { Textarea } from '@/components/ui/textarea';
// Cross-feature imports via public barrel (FSD §2)
import { useLanguages } from '@/features/curriculum/languages';
import { useLearningGoals } from '@/features/curriculum/goals';
import { useSeriesDetail } from '../../hooks/useCourseSeries';
import { useCreateSeries, useUpdateSeries } from '../../hooks/useCourseSeriesMutations';
import { useSeriesForm } from '../../hooks/useCourseSeriesForm';
import type { SeriesFormValues } from '../../hooks/useCourseSeriesForm';
import type { CreateCourseSeriesPayload, UpdateCourseSeriesPayload } from '../../types/course-series.types';
import { SeriesThumbnailCard } from '../../components/SeriesThumbnailCard/SeriesThumbnailCard';
import { courseSeriesApi } from '../../api/course-series.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SeriesEditorPage() {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const isCreateMode = !slug || slug === 'new';

    // ── Data fetching ─────────────────────────────────────────────────────────
    const { data: seriesDetail, isLoading: isLoadingSeries } = useSeriesDetail(slug);
    const { data: languages = [] } = useLanguages();
    const { data: goalsData } = useLearningGoals({ limit: 100, isActive: true });
    const goals = goalsData?.data ?? [];

    // ── Form ──────────────────────────────────────────────────────────────────
    const form = useSeriesForm({ series: isCreateMode ? null : (seriesDetail ?? null) });    // Holds the locally-selected File before save; cleared after successful upload
    const [pendingThumbnail, setPendingThumbnail] = useState<File | null>(null);
    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMutation = useCreateSeries();
    const updateMutation = useUpdateSeries();

    const isPending = createMutation.isPending || updateMutation.isPending;

    // ── Submit handler ────────────────────────────────────────────────────────
    const handleSubmit = form.handleSubmit(async (values: SeriesFormValues) => {
        try {
            // Step 1 — upload pending thumbnail first if the user selected a new file
            let resolvedThumbnailUrl: string | undefined | null = values.thumbnailUrl || undefined;
            if (pendingThumbnail) {
                const uploaded = await courseSeriesApi.uploadThumbnail(pendingThumbnail);
                resolvedThumbnailUrl = uploaded.url;
                // Persist URL into form so that the field reflects reality after save
                form.setValue('thumbnailUrl', uploaded.url, { shouldDirty: false });
                setPendingThumbnail(null);
            }

            // Step 2 — persist the series record
            if (isCreateMode) {
                const payload: CreateCourseSeriesPayload = {
                    slug: values.slug,
                    title: values.title,
                    description: values.description || undefined,
                    thumbnailUrl: resolvedThumbnailUrl ?? undefined,
                    languageId: values.languageId,
                    learningGoalId: values.learningGoalId,
                    isActive: values.isActive,
                };
                await createMutation.mutateAsync(payload);
            } else {
                const payload: UpdateCourseSeriesPayload = {
                    title: values.title,
                    description: values.description || null,
                    thumbnailUrl: resolvedThumbnailUrl ?? null,
                    isActive: values.isActive,
                };
                await updateMutation.mutateAsync({ slug: slug as string, payload });
            }
        } catch {
            // Errors handled by mutation onError toasts
        }
    });

    // ── Loading state ─────────────────────────────────────────────────────────
    if (!isCreateMode && isLoadingSeries) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-14 w-full rounded-lg" />
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="space-y-4 xl:col-span-2">
                        <Skeleton className="h-60 w-full rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-44 w-full rounded-lg" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* ── Page header ── */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <PageHeader
                        title={isCreateMode ? 'Tạo Series mới' : `Chỉnh sửa: ${seriesDetail?.title ?? ''}`}
                        description="Cấu hình bộ khóa học theo ngôn ngữ và mục tiêu học tập"
                    />
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/curriculum/series')}
                            aria-label="Quay lại danh sách series"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Quay lại
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || form.formState.isSubmitting || !form.formState.isValid}
                            aria-label={isCreateMode ? 'Tạo series mới' : 'Lưu thay đổi'}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {form.formState.isSubmitting
                                ? 'Đang lưu...'
                                : isPending
                                  ? 'Đang lưu...'
                                  : isCreateMode
                                    ? 'Tạo series'
                                    : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>

                {/* ── 2-column layout ── */}
                <div className="grid gap-4 xl:grid-cols-3">
                    {/* ── Left column (2/3) ── */}
                    <div className="space-y-4 xl:col-span-2">
                        {/* Basic info card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Thông tin cơ bản</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tiêu đề <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="VD: Lộ trình Du lịch Toàn diện"
                                                        aria-required="true"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="slug"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Slug <span className="text-destructive">*</span>
                                                    {!isCreateMode && (
                                                        <Badge variant="secondary" className="ml-2 text-xs">
                                                            Không thể thay đổi
                                                        </Badge>
                                                    )}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        disabled={!isCreateMode}
                                                        placeholder="VD: travel-english-beginner"
                                                        aria-required="true"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mô tả</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    rows={3}
                                                    placeholder="Mô tả ngắn gọn về mục tiêu và đối tượng của series..."
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Config card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Cấu hình</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="languageId"
                                    render={({ field }) => {
                                        const selectedLang = languages.find((l) => l._id === field.value);
                                        return (
                                            <FormItem>
                                                <FormLabel>Ngôn ngữ <span className="text-destructive">*</span></FormLabel>
                                                {isCreateMode ? (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <FormControl>
                                                            <SelectTrigger aria-label="Chọn ngôn ngữ">
                                                                <SelectValue placeholder="Chọn ngôn ngữ..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {languages.map((lang) => (
                                                                <SelectItem key={lang._id} value={lang._id}>
                                                                    {lang.name} ({lang.code.toUpperCase()})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted px-3 text-sm">
                                                        {selectedLang ? (
                                                            <>
                                                                {selectedLang.flagIconUrl && (
                                                                    <img
                                                                        src={selectedLang.flagIconUrl}
                                                                        alt=""
                                                                        className="h-4 w-4 rounded-sm object-cover"
                                                                        aria-hidden="true"
                                                                    />
                                                                )}
                                                                <span>{selectedLang.name}</span>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {selectedLang.code.toUpperCase()}
                                                                </Badge>
                                                            </>
                                                        ) : (
                                                            <Loading size="sm" className="justify-start" />
                                                        )}
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Không thể thay đổi sau khi tạo.
                                                </p>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <FormField
                                    control={form.control}
                                    name="learningGoalId"
                                    render={({ field }) => {
                                        const selectedGoal = goals.find((g) => g._id === field.value);
                                        return (
                                            <FormItem>
                                                <FormLabel>Mục tiêu học tập <span className="text-destructive">*</span></FormLabel>
                                                {isCreateMode ? (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <FormControl>
                                                            <SelectTrigger aria-label="Chọn mục tiêu học tập">
                                                                <SelectValue placeholder="Chọn mục tiêu..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {goals.map((goal) => (
                                                                <SelectItem key={goal._id} value={goal._id}>
                                                                    {goal.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                                                        {selectedGoal ? (
                                                            <span>{selectedGoal.title}</span>
                                                        ) : (
                                                            <Loading size="sm" className="justify-start" />
                                                        )}
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Không thể thay đổi sau khi tạo.
                                                </p>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right column (1/3) ── */}
                    <div className="space-y-4">
                        {/* Thumbnail card — upload deferred to Save action */}
                        <SeriesThumbnailCard
                            control={form.control}
                            onFileSelect={setPendingThumbnail}
                            onClear={() => form.setValue('thumbnailUrl', '', { shouldDirty: true })}
                        />

                        {/* Status card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Trạng thái</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Kích hoạt</FormLabel>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        aria-label="Bật/tắt trạng thái kích hoạt"
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {!isCreateMode && seriesDetail && (
                                    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                                        <span className="text-muted-foreground">Số khóa học</span>
                                        <Badge variant="secondary">
                                            {seriesDetail.totalCourses} khóa
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Metadata card — edit mode only */}
                        {!isCreateMode && seriesDetail && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Thông tin hệ thống</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                                    <div className="flex justify-between gap-2">
                                        <span>Tạo lúc</span>
                                        <span className="font-medium text-foreground">
                                            {formatDate(seriesDetail.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <span>Cập nhật</span>
                                        <span className="font-medium text-foreground">
                                            {formatDate(seriesDetail.updatedAt)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </form>
        </Form>
    );
}
