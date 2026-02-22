import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
// Cross-feature imports via public barrels (FSD §2)
import { useSeriesList } from '@/features/curriculum/series';
import { useCoursesBySeriesId } from '../../hooks/useCourses';
import { useCreateCourse } from '../../hooks/useCourseMutations';
import { CEFR_LEVELS } from '../../types/course.types';
import type { CreateCoursePayload } from '../../types/course.types';

// ─── Schema ───────────────────────────────────────────────────────────────────
// Quick-creation schema — finalExamConfig & AI Roadmap are configured
// post-creation inside the Course Studio, not here.

const createCourseSchema = z.object({
    seriesId: z.string().min(1, 'Vui lòng chọn một Series'),
    name: z
        .string()
        .min(3, 'Tên phải có ít nhất 3 ký tự')
        .max(200, 'Tên không được vượt quá 200 ký tự'),
    level: z.enum([...CEFR_LEVELS] as [string, ...string[]]),
    orderInSeries: z.coerce.number().int().min(1, 'Thứ tự phải ≥ 1'),
    prerequisiteCourseId: z.string().nullable().optional(),
});

type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * Pre-selected seriesId from the filter bar.
     * When provided, the Series field is locked (read-only) to prevent
     * the admin from accidentally creating a course in the wrong series.
     */
    defaultSeriesId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateCourseDrawer({ open, onOpenChange, defaultSeriesId }: Props) {
    // ── Hooks ─────────────────────────────────────────────────────────────────
    const createMutation = useCreateCourse();

    const form = useForm<CreateCourseFormValues, any, CreateCourseFormValues>({
        resolver: zodResolver(createCourseSchema) as Resolver<CreateCourseFormValues, any, CreateCourseFormValues>,
        defaultValues: {
            seriesId: defaultSeriesId ?? '',
            name: '',
            level: 'A1',
            orderInSeries: 1,
            prerequisiteCourseId: null,
        },
    });

    const watchedSeriesId = form.watch('seriesId');
    const isSeriesLocked = Boolean(defaultSeriesId);

    // Series list — fetched only when the series selector is shown (unlocked)
    const { data: seriesData, isLoading: isLoadingSeries } = useSeriesList({ limit: 100 });
    const allSeries = seriesData?.data ?? [];

    // Existing courses in the chosen series → populate the Prerequisite dropdown
    const { data: existingCourses = [] } = useCoursesBySeriesId(
        { seriesId: watchedSeriesId },
    );

    // Keep seriesId in sync when the parent filter changes (e.g., user picks a different series
    // in the filter bar WHILE the drawer is open)
    useEffect(() => {
        form.setValue('seriesId', defaultSeriesId ?? '', { shouldValidate: false });
    }, [defaultSeriesId, form]);

    // Reset to clean state whenever the drawer closes
    useEffect(() => {
        if (!open) {
            form.reset({
                seriesId: defaultSeriesId ?? '',
                name: '',
                level: 'A1',
                orderInSeries: 1,
                prerequisiteCourseId: null,
            });
        }
    }, [open, defaultSeriesId, form]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSubmit = form.handleSubmit((values) => {
        const payload: CreateCoursePayload = {
            seriesId: values.seriesId,
            name: values.name,
            level: values.level as CreateCoursePayload['level'],
            orderInSeries: values.orderInSeries,
            prerequisiteCourseId: values.prerequisiteCourseId ?? null,
        };
        // useCreateCourse.onSuccess already navigates to /curriculum/courses/:id/studio
        createMutation.mutate(payload, {
            onSuccess: () => onOpenChange(false),
        });
    });

    // ── Render ────────────────────────────────────────────────────────────────
    const lockedSeriesTitle =
        allSeries.find((s) => s._id === defaultSeriesId)?.title ?? defaultSeriesId;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
            >
                {/* ── Header ── */}
                <SheetHeader className="border-b px-6 pb-4 pt-6">
                    <SheetTitle>Tạo Khóa học mới</SheetTitle>
                    <SheetDescription>
                        Điền thông tin cơ bản. Cấu hình nâng cao (AI Roadmap, Exam config) sẽ có
                        ngay trong <strong>Course Studio</strong> sau khi tạo.
                    </SheetDescription>
                </SheetHeader>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <Form {...form}>
                        <form
                            id="create-course-form"
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            {/* 1 · Series */}
                            <FormField
                                control={form.control}
                                name="seriesId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Thuộc Series{' '}
                                            <span className="text-destructive" aria-hidden="true">
                                                *
                                            </span>
                                        </FormLabel>
                                        {isSeriesLocked ? (
                                            // Read-only pill when a series is already chosen
                                            <div
                                                className="rounded-md border bg-muted/60 px-3 py-2 text-sm"
                                                aria-label={`Series: ${lockedSeriesTitle}`}
                                            >
                                                {lockedSeriesTitle}
                                            </div>
                                        ) : (
                                            <Select
                                                value={field.value}
                                                onValueChange={(v) => {
                                                    field.onChange(v);
                                                    // Reset prerequisite when series changes
                                                    form.setValue('prerequisiteCourseId', null);
                                                }}
                                                disabled={isLoadingSeries}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Chọn Series">
                                                        <SelectValue
                                                            placeholder={
                                                                isLoadingSeries
                                                                    ? 'Đang tải...'
                                                                    : 'Chọn một Series...'
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {allSeries.map((s) => (
                                                        <SelectItem key={s._id} value={s._id}>
                                                            {s.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 2 · Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Tên Khóa học{' '}
                                            <span className="text-destructive" aria-hidden="true">
                                                *
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="VD: Level A1 – Nhập môn Sinh tồn"
                                                autoFocus
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 3 · Level + Order (2-column grid) */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Cấp độ CEFR{' '}
                                                <span className="text-destructive" aria-hidden="true">
                                                    *
                                                </span>
                                            </FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Cấp độ CEFR">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {CEFR_LEVELS.map((lvl) => (
                                                        <SelectItem key={lvl} value={lvl}>
                                                            {lvl}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="orderInSeries"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Thứ tự{' '}
                                                <span className="text-destructive" aria-hidden="true">
                                                    *
                                                </span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    aria-label="Thứ tự trong series"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(Number(e.target.value))
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 4 · Prerequisite (optional) */}
                            <FormField
                                control={form.control}
                                name="prerequisiteCourseId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Khóa học tiên quyết{' '}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                (Tùy chọn)
                                            </span>
                                        </FormLabel>
                                        <Select
                                            value={field.value ?? 'none'}
                                            onValueChange={(v) =>
                                                field.onChange(v === 'none' ? null : v)
                                            }
                                            disabled={
                                                !watchedSeriesId || existingCourses.length === 0
                                            }
                                        >
                                            <FormControl>
                                                <SelectTrigger aria-label="Khóa học tiên quyết">
                                                    <SelectValue placeholder="Không yêu cầu" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Không yêu cầu</SelectItem>
                                                {existingCourses.map((c) => (
                                                    <SelectItem key={c._id} value={c._id}>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            [{c.level}]
                                                        </span>{' '}
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {!watchedSeriesId && (
                                            <p className="text-xs text-muted-foreground">
                                                Chọn Series trước để xem danh sách.
                                            </p>
                                        )}
                                        {watchedSeriesId && existingCourses.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Series này chưa có khóa học nào.
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                {/* ── Sticky footer ── */}
                <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-muted/20 px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createMutation.isPending}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="create-course-form"
                        disabled={createMutation.isPending}
                    >
                        {createMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        {createMutation.isPending ? 'Đang tạo...' : 'Tạo Khóa học →'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
