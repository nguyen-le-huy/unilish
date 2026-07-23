import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { courseApi } from '../api/course.api';
import { COURSE_QUERY_KEYS } from '../constants/query-keys';
import type { CourseListResponse, CreateCoursePayload, UpdateCoursePayload } from '../types/course.types';

// ─── Create ───────────────────────────────────────────────────────────────────

export const useCreateCourse = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (payload: CreateCoursePayload) => courseApi.createCourse(payload),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.lists() });
            toast.success(`Đã tạo course "${created.name}"`);
            navigate(`/curriculum/courses/${created._id}/studio`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo course thất bại'));
        },
    });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const useUpdateCourse = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateCoursePayload }) =>
            courseApi.updateCourse(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.detail(updated._id) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(updated._id) });
            toast.success(`Đã cập nhật course "${updated.name}"`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật course thất bại'));
        },
    });
};

export const useUploadCourseThumbnail = () => useMutation({
    mutationFn: (file: File) => courseApi.uploadCourseThumbnail(file),
    onError: (error) => {
        toast.error(getApiErrorMessage(error, 'Tải ảnh khóa học thất bại'));
    },
});

// ─── Toggle status (optimistic update) ───────────────────────────────────────

export const useToggleCourseStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (courseId: string) => courseApi.toggleCourseStatus(courseId),

        onMutate: async (courseId) => {
            await queryClient.cancelQueries({ queryKey: COURSE_QUERY_KEYS.lists() });

            const previousLists = queryClient.getQueriesData<CourseListResponse>({
                queryKey: COURSE_QUERY_KEYS.lists(),
            });

            queryClient.setQueriesData<CourseListResponse>(
                { queryKey: COURSE_QUERY_KEYS.lists() },
                (old) =>
                    old
                        ? {
                              ...old,
                              data: old.data.map((c) =>
                                  c._id === courseId ? { ...c, isActive: !c.isActive } : c,
                              ),
                          }
                        : old,
            );

            return { previousLists };
        },

        onError: (error, _, context) => {
            for (const [key, data] of context?.previousLists ?? []) {
                queryClient.setQueryData(key, data);
            }
            toast.error(getApiErrorMessage(error, 'Thay đổi trạng thái thất bại'));
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.lists() });
        },
    });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const useDeleteCourse = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (courseId: string) => courseApi.deleteCourse(courseId),
        onSuccess: (_, courseId) => {
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.lists() });
            queryClient.removeQueries({ queryKey: COURSE_QUERY_KEYS.detail(courseId) });
            queryClient.removeQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success('Đã xóa course thành công');
            navigate('/curriculum/courses');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Xóa course thất bại'));
        },
    });
};
