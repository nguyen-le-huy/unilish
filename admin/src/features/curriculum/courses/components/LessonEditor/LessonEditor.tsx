import { memo, useCallback, useRef, type BaseSyntheticEvent } from 'react';
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
import { useLessonForm, type LessonFormValues } from '../../hooks/useLessonForm';
import type { LessonSummary, UpdateLessonPayload, LessonType } from '../../types/course.types';
import { LESSON_TYPES } from '../../types/course.types';
import { SpeakingStudio, type SpeakingStudioRef } from '../SpeakingStudio/SpeakingStudio';
import { WritingStudio, type WritingStudioRef } from '../WritingStudio/WritingStudio';
import { notification } from '@/lib/notification';

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
    const speakingStudioRef = useRef<SpeakingStudioRef>(null);
    const writingStudioRef = useRef<WritingStudioRef>(null);
    const selectedType = form.watch('type');
    const isTypeSelected = Boolean(selectedType);

    const handleFormSubmit = useCallback(async (values: LessonFormValues) => {
        try {
            // Nếu là bài học Speaking, trigger validate và save của SpeakingStudio trước
            if (values.type === 'SPEAKING' && speakingStudioRef.current) {
                await speakingStudioRef.current.saveSpeakingContent();
            }

            if (values.type === 'WRITING' && writingStudioRef.current) {
                await writingStudioRef.current.saveWritingContent();
            }

            const payload: UpdateLessonPayload = {
                title: values.title,
                type: values.type as LessonType,
            };

            updateMutation.mutate({ id: lesson._id, payload });
        } catch (error) {
            if (error instanceof Error && error.message === 'Speaking validation failed') {
                notification.warning('Nội dung Speaking chưa hợp lệ. Vui lòng kiểm tra lại các tab.');
                return;
            }

            if (error instanceof Error && error.message === 'Writing validation failed') {
                notification.warning('Nội dung Writing chưa hợp lệ. Vui lòng kiểm tra lại.');
                return;
            }

            notification.error('Lưu nội dung bài học thất bại. Vui lòng thử lại.');
        }
    }, [lesson._id, updateMutation]);

    const onSubmit = useCallback((event?: BaseSyntheticEvent) => {
        void form.handleSubmit(handleFormSubmit)(event);
    }, [form, handleFormSubmit]);

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cài đặt bài học</h2>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={onSubmit} disabled={updateMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                        {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-4">
                    {!isTypeSelected && (
                        <>
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

                        </>
                    )}

                    {/* Content Editor Placeholder */}
                    <Card className={selectedType === 'SPEAKING' || selectedType === 'WRITING' ? 'border-indigo-100 shadow-sm' : 'border-dashed'}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Trình soạn nội dung
                            </CardTitle>
                            {selectedType !== 'SPEAKING' && selectedType !== 'WRITING' && (
                                <CardDescription>Sắp ra mắt trong Sprint 2</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            {selectedType === 'SPEAKING' ? (
                                <SpeakingStudio ref={speakingStudioRef} lesson={lesson} />
                            ) : selectedType === 'WRITING' ? (
                                <WritingStudio ref={writingStudioRef} lesson={lesson} />
                            ) : (
                                <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                                    Trình soạn nội dung bài học đa dạng sẽ được xây dựng tại đây
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
});
