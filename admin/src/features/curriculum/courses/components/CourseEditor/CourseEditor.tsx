import { memo } from 'react';
import { Save } from 'lucide-react';
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
import { useCourseDetail } from '../../hooks/useCourses';
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

    const onSubmit = form.handleSubmit((values) => {
        const payload: UpdateCoursePayload = {
            name: values.name,
            level: values.level as UpdateCoursePayload['level'],
            orderInSeries: values.orderInSeries,
            prerequisiteCourseId: values.prerequisiteCourseId ?? undefined,
            finalExamConfig: values.finalExamConfig,
        };
        updateMutation.mutate({ id: courseId, payload });
    });

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-40 w-full animate-pulse rounded bg-muted" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cài đặt khóa học</h2>
                <Button size="sm" onClick={onSubmit} disabled={updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Thông tin cơ bản</CardTitle>
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
                                            <Input placeholder="VD: Tiếng Anh cơ bản A1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Level + Order row */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cấp độ CEFR</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
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
                                    name="orderInSeries"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thứ tự trong series</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    {...field}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Final Exam Config */}
                    <FinalExamConfigCard control={form.control} />
                </form>
            </Form>
        </div>
    );
});
