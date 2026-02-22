import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { lessonApi } from '../api/lesson.api';
import { COURSE_QUERY_KEYS, LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    CreateLessonPayload,
    ReorderLessonsPayload,
    UpdateLessonPayload,
} from '../types/course.types';

// ─── Create ───────────────────────────────────────────────────────────────────

export const useCreateLesson = (courseId: string, unitId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateLessonPayload) => lessonApi.createLesson(payload),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.list(unitId) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success(`Đã tạo lesson "${created.title}"`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo lesson thất bại'));
        },
    });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const useUpdateLesson = (courseId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateLessonPayload }) =>
            lessonApi.updateLesson(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.detail(updated._id) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success(`Đã cập nhật lesson "${updated.title}"`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật lesson thất bại'));
        },
    });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const useDeleteLesson = (courseId: string, unitId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lessonId: string) => lessonApi.deleteLesson(lessonId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.list(unitId) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success('Đã xóa lesson thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Xóa lesson thất bại'));
        },
    });
};

// ─── Reorder ─────────────────────────────────────────────────────────────────

export const useReorderLessons = (courseId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReorderLessonsPayload) => lessonApi.reorderLessons(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Sắp xếp lesson thất bại'));
        },
    });
};
