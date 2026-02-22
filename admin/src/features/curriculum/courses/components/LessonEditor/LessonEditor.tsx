import { memo } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUpdateLesson } from '../../hooks/useLessonMutations';
import { useLessonForm } from '../../hooks/useLessonForm';
import type { LessonSummary, UpdateLessonPayload, LessonType, PracticeMode } from '../../types/course.types';
import { LESSON_TYPES, PRACTICE_MODES } from '../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lesson: LessonSummary;
    courseId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LESSON_TYPE_LABELS: Record<string, string> = {
    VOCAB: 'Từ vựng',
    GRAMMAR: 'Ngữ pháp',
    READING: 'Đọc hiểu',
    LISTENING: 'Nghe hiểu',
    SPEAKING: 'Nói',
    WRITING: 'Viết',
    UNIT_TEST: 'Kiểm tra chương',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const LessonEditor = memo(function LessonEditor({ lesson, courseId }: Props) {
    const updateMutation = useUpdateLesson(courseId);
    const form = useLessonForm({ lesson });

    const onSubmit = form.handleSubmit((values) => {
        const payload: UpdateLessonPayload = {
            title: values.title,
            type: values.type as LessonType,
            practiceConfig: {
                mode: values.practiceConfig.mode as PracticeMode,
                passingScore: values.practiceConfig.passingScore,
            },
        };
        updateMutation.mutate({ id: lesson._id, payload });
    });

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cài đặt bài học</h2>
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
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên bài học</FormLabel>
                                        <FormControl>
                                            <Input placeholder="VD: Xin chào & Tạm biệt" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loại bài học</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger aria-label="Loại bài học">
                                                    <SelectValue placeholder="Chọn loại" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {LESSON_TYPES.map((t) => (
                                                    <SelectItem key={t} value={t}>
                                                        {LESSON_TYPE_LABELS[t] ?? t}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Practice Config */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Cấu hình luyện tập</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="practiceConfig.mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chế độ luyện tập</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger aria-label="Chế độ luyện tập">
                                                    <SelectValue placeholder="Chọn chế độ" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PRACTICE_MODES.map((m) => (
                                                    <SelectItem key={m} value={m}>
                                                        {m === 'FIXED' ? 'Cố định (Câu hỏi cụ thể)' : 'Linh hoạt (AI tạo)'}
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
                                name="practiceConfig.passingScore"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Điểm đậu (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Content Editor Placeholder */}
                    <Card className="border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Trình soạn nội dung
                            </CardTitle>
                            <CardDescription>Sắp ra mắt trong Sprint 2</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                                Trình soạn nội dung bài học đa dạng sẽ được xây dựng tại đây
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
});
