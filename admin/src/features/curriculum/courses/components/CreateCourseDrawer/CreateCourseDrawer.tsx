import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
// Cross-feature imports via public barrels (FSD §2)
import { useLanguages } from '@/features/curriculum/languages';
import { useLearningGoals } from '@/features/curriculum/goals';
import { useCreateCourse, useUploadCourseThumbnail } from '../../hooks/useCourseMutations';
import { CEFR_LEVELS } from '../../types/course.types';
import type { CreateCoursePayload } from '../../types/course.types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const slugFromName = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

// ─── Schema ───────────────────────────────────────────────────────────────────

const createCourseSchema = z.object({
    languageId: z.string().min(1, 'Vui lòng chọn ngôn ngữ'),
    learningGoalId: z.string().min(1, 'Vui lòng chọn mục tiêu'),
    name: z
        .string()
        .min(3, 'Tên phải có ít nhất 3 ký tự')
        .max(200, 'Tên không được vượt quá 200 ký tự'),
    slug: z
        .string()
        .min(2, 'Slug phải có ít nhất 2 ký tự')
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang'),
    description: z.string().max(500).optional(),
    thumbnailUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    level: z.enum([...CEFR_LEVELS] as [string, ...string[]]),
});

type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultLanguageId?: string;
    defaultLearningGoalId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateCourseDrawer({
    open,
    onOpenChange,
    defaultLanguageId,
    defaultLearningGoalId,
}: Props) {
    const createMutation = useCreateCourse();
    const uploadThumbnailMutation = useUploadCourseThumbnail();

    const form = useForm<CreateCourseFormValues, unknown, CreateCourseFormValues>({
        resolver: zodResolver(createCourseSchema) as Resolver<
            CreateCourseFormValues,
            unknown,
            CreateCourseFormValues
        >,
        defaultValues: {
            languageId: defaultLanguageId ?? '',
            learningGoalId: defaultLearningGoalId ?? '',
            name: '',
            slug: '',
            description: '',
            thumbnailUrl: '',
            level: 'A1',
        },
    });

    const watchedLanguageId = form.watch('languageId');
    const watchedLearningGoalId = form.watch('learningGoalId');
    const watchedName = form.watch('name');
    const thumbnailUrl = form.watch('thumbnailUrl');
    const isLanguageLocked = Boolean(defaultLanguageId);
    const isGoalLocked = Boolean(defaultLearningGoalId);

    // Language + Goal data
    const { data: languages = [] } = useLanguages({ isActive: true });
    const { data: goalsData } = useLearningGoals({ limit: 100, isActive: true });
    const allGoals = goalsData?.data ?? [];

    // Goals filtered by selected language (cascade)
    const filteredGoals = useMemo(
        () =>
            watchedLanguageId
                ? allGoals.filter((g) => g.supportedLanguages.includes(watchedLanguageId))
                : allGoals,
        [allGoals, watchedLanguageId],
    );

    // ── Keep pre-selected values in sync ─────────────────────────────────────
    useEffect(() => {
        form.setValue('languageId', defaultLanguageId ?? '', { shouldValidate: false });
    }, [defaultLanguageId, form]);

    useEffect(() => {
        form.setValue('learningGoalId', defaultLearningGoalId ?? '', { shouldValidate: false });
    }, [defaultLearningGoalId, form]);

    // Reset when goal is not compatible with new language
    useEffect(() => {
        if (watchedLanguageId && watchedLearningGoalId) {
            const goal = allGoals.find((g) => g._id === watchedLearningGoalId);
            if (goal && !goal.supportedLanguages.includes(watchedLanguageId)) {
                form.setValue('learningGoalId', '', { shouldValidate: false });
            }
        }
    }, [watchedLanguageId, watchedLearningGoalId, allGoals, form]);

    // ── Auto-slug from name (only when slug field hasn't been manually edited) ──
    const slugEditedRef = useRef(false);
    const slugManualEdit = useCallback(() => {
        slugEditedRef.current = true;
    }, []);

    useEffect(() => {
        if (!slugEditedRef.current && watchedName) {
            form.setValue('slug', slugFromName(watchedName), { shouldValidate: true });
        }
    }, [watchedName, form]);

    // Reset to clean state whenever the drawer closes
    const resetForm = useCallback(() => {
        form.reset({
            languageId: defaultLanguageId ?? '',
            learningGoalId: defaultLearningGoalId ?? '',
            name: '',
            slug: '',
            description: '',
            thumbnailUrl: '',
            level: 'A1',
        });
        slugEditedRef.current = false;
    }, [defaultLanguageId, defaultLearningGoalId, form]);

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open, resetForm]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSubmit = form.handleSubmit((values) => {
        const payload: CreateCoursePayload = {
            languageId: values.languageId,
            learningGoalId: values.learningGoalId,
            slug: values.slug,
            name: values.name,
            description: values.description?.trim() || null,
            thumbnailUrl: values.thumbnailUrl?.trim() || null,
            level: values.level as CreateCoursePayload['level'],
        };
        createMutation.mutate(payload, {
            onSuccess: () => onOpenChange(false),
        });
    });

    // ── Render helpers ────────────────────────────────────────────────────────
    const lockedLanguageName =
        languages.find((l) => l._id === defaultLanguageId)?.name ?? defaultLanguageId;
    const lockedGoalTitle =
        allGoals.find((g) => g._id === defaultLearningGoalId)?.title ?? defaultLearningGoalId;

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
                        Điền thông tin cơ bản để tạo khóa học mới.
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
                            {/* 1 · Language */}
                            <FormField
                                control={form.control}
                                name="languageId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Ngôn ngữ{' '}
                                            <span className="text-destructive" aria-hidden="true">
                                                *
                                            </span>
                                        </FormLabel>
                                        {isLanguageLocked ? (
                                            <div
                                                className="rounded-md border bg-muted/60 px-3 py-2 text-sm"
                                                aria-label={`Ngôn ngữ: ${lockedLanguageName}`}
                                            >
                                                {lockedLanguageName}
                                            </div>
                                        ) : (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Chọn ngôn ngữ">
                                                        <SelectValue placeholder="Chọn một ngôn ngữ..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {languages.map((lang) => (
                                                        <SelectItem key={lang._id} value={lang._id}>
                                                            {lang.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 2 · Learning Goal */}
                            <FormField
                                control={form.control}
                                name="learningGoalId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Mục tiêu{' '}
                                            <span className="text-destructive" aria-hidden="true">
                                                *
                                            </span>
                                        </FormLabel>
                                        {isGoalLocked ? (
                                            <div
                                                className="rounded-md border bg-muted/60 px-3 py-2 text-sm"
                                                aria-label={`Mục tiêu: ${lockedGoalTitle}`}
                                            >
                                                {lockedGoalTitle}
                                            </div>
                                        ) : (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={!watchedLanguageId}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Chọn mục tiêu">
                                                        <SelectValue placeholder="Chọn mục tiêu học tập..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {filteredGoals.map((goal) => (
                                                        <SelectItem key={goal._id} value={goal._id}>
                                                            {goal.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {!watchedLanguageId && (
                                            <FormDescription>
                                                Chọn Ngôn ngữ trước để lọc mục tiêu phù hợp.
                                            </FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 3 · Name + Slug */}
                            <div className="space-y-4">
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

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Slug{' '}
                                                <span className="text-destructive" aria-hidden="true">
                                                    *
                                                </span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="level-a1-nhap-mon-sinh-ton"
                                                    {...field}
                                                    onChange={(e) => {
                                                        slugManualEdit();
                                                        field.onChange(e);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Định danh duy nhất cho khóa học (tự động tạo từ tên).
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 4 · Level */}
                            <div className="max-w-xs">
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

                            </div>

                            {/* 5 · Description (optional) */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Mô tả{' '}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                (Tùy chọn)
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Mô tả ngắn về khóa học..."
                                                rows={3}
                                                maxLength={500}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 6 · Thumbnail upload (optional) */}
                            <FormItem>
                                <FormLabel>Ảnh khóa học <span className="text-xs font-normal text-muted-foreground">(Tùy chọn)</span></FormLabel>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadThumbnailMutation.isPending}
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        event.target.value = '';
                                        if (!file) return;
                                        uploadThumbnailMutation.mutate(file, {
                                            onSuccess: ({ url }) => form.setValue('thumbnailUrl', url, { shouldValidate: true }),
                                        });
                                    }}
                                />
                                <p className="flex items-center text-xs text-muted-foreground">
                                    {uploadThumbnailMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tải ảnh...</> : <><Upload className="mr-2 h-4 w-4" />Chọn ảnh từ thiết bị</>}
                                </p>
                                {thumbnailUrl ? <img src={thumbnailUrl} alt="Ảnh khóa học" className="h-32 w-full rounded-md border object-cover" /> : null}
                            </FormItem>
                        </form>
                    </Form>
                </div>

                {/* ── Sticky footer ── */}
                <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-muted/20 px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createMutation.isPending || uploadThumbnailMutation.isPending}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="create-course-form"
                        disabled={createMutation.isPending || uploadThumbnailMutation.isPending}
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
