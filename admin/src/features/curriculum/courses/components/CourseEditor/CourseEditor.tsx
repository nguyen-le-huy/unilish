import { memo, useMemo } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguages } from '@/features/curriculum/languages';
import { useLearningGoals } from '@/features/curriculum/goals';
import { useCourseDetail, useCourses } from '../../hooks/useCourses';
import { useUpdateCourse } from '../../hooks/useCourseMutations';
import { useCourseForm } from '../../hooks/useCourseForm';
import { CEFR_LEVELS } from '../../types/course.types';
import type { UpdateCoursePayload } from '../../types/course.types';
import { FinalExamConfigCard } from './FinalExamConfigCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    courseId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CourseEditor = memo(function CourseEditor({ courseId }: Props) {
    const { data: course, isLoading } = useCourseDetail(courseId);
    const updateMutation = useUpdateCourse();
    const form = useCourseForm({ course: course ?? null });

    // Language + Goal data for selectors
    const { data: languages = [] } = useLanguages({ isActive: true });
    const { data: goalsData } = useLearningGoals({ limit: 100, isActive: true });
    const allGoals = goalsData?.data ?? [];

    const watchedLanguageId = form.watch('languageId');
    const watchedLearningGoalId = form.watch('learningGoalId');

    // Filter goals by selected language
    const filteredGoals = useMemo(
        () =>
            watchedLanguageId
                ? allGoals.filter((g) => g.supportedLanguages.includes(watchedLanguageId))
                : allGoals,
        [allGoals, watchedLanguageId],
    );

    // Prerequisite candidates: courses with same language + goal, excluding self
    const { data: candidateData } = useCourses({
        languageId: watchedLanguageId || undefined,
        learningGoalId: watchedLearningGoalId || undefined,
        limit: 100,
        sort: 'orderIndex',
        order: 'asc',
    });
    const allCandidates = candidateData?.data ?? [];
    const prerequisiteOptions = useMemo(
        () => allCandidates.filter((c) => c._id !== courseId),
        [allCandidates, courseId],
    );

    const onSubmit = form.handleSubmit((values) => {
        const payload: UpdateCoursePayload = {
            name: values.name,
            slug: values.slug,
            description: values.description ?? undefined,
            thumbnailUrl: values.thumbnailUrl ?? undefined,
            level: values.level as UpdateCoursePayload['level'],
            orderIndex: values.orderIndex,
            languageId: values.languageId,
            learningGoalId: values.learningGoalId,
            prerequisiteCourseId: values.prerequisiteCourseId ?? undefined,
            finalExamConfig: values.finalExamConfig,
        };
        updateMutation.mutate({ id: courseId, payload });
    });

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-60 w-full rounded-xl" />
                <Skeleton className="h-60 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cài đặt khóa học</h2>
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={updateMutation.isPending}
                >
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* ── Basic Info ── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Thông tin cơ bản
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên khóa học</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="VD: Tiếng Anh cơ bản A1"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Slug */}
                            <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Slug</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="tien-anh-co-ban-a1"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Định danh duy nhất (chữ thường, số, dấu gạch ngang).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Language + Goal row */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="languageId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ngôn ngữ</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={(v) => {
                                                    field.onChange(v);
                                                    form.setValue('learningGoalId', '');
                                                }}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Chọn ngôn ngữ">
                                                        <SelectValue placeholder="Chọn ngôn ngữ" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {languages.map((lang) => (
                                                        <SelectItem
                                                            key={lang._id}
                                                            value={lang._id}
                                                        >
                                                            {lang.name}
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
                                    name="learningGoalId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mục tiêu</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={!watchedLanguageId}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Chọn mục tiêu">
                                                        <SelectValue placeholder="Chọn mục tiêu" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {filteredGoals.map((goal) => (
                                                        <SelectItem
                                                            key={goal._id}
                                                            value={goal._id}
                                                        >
                                                            {goal.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Level + Order row */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cấp độ CEFR</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger aria-label="Cấp độ CEFR">
                                                        <SelectValue placeholder="Chọn cấp độ" />
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
                                    name="orderIndex"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thứ tự</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
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

                            {/* Prerequisite */}
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
                                            disabled={prerequisiteOptions.length === 0}
                                        >
                                            <FormControl>
                                                <SelectTrigger aria-label="Khóa học tiên quyết">
                                                    <SelectValue placeholder="Không yêu cầu" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Không yêu cầu
                                                </SelectItem>
                                                {prerequisiteOptions.map((c) => (
                                                    <SelectItem key={c._id} value={c._id}>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            [{c.level}]
                                                        </span>{' '}
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {prerequisiteOptions.length === 0 &&
                                            watchedLanguageId &&
                                            watchedLearningGoalId && (
                                                <FormDescription>
                                                    Không có khóa học nào khác để chọn làm tiên quyết.
                                                </FormDescription>
                                            )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* ── Metadata (Description + Thumbnail) ── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Mô tả & Hình ảnh
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mô tả</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Mô tả ngắn về khóa học..."
                                                rows={3}
                                                maxLength={500}
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="thumbnailUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL Thumbnail</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com/thumb.jpg"
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Final Exam Config */}
                    <FinalExamConfigCard control={form.control} />
                </form>
            </Form>
        </div>
    );
});
