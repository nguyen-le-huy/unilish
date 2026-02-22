import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { courseSeriesApi } from '../api/course-series.api';
import { COURSE_SERIES_QUERY_KEYS } from '../constants/query-keys';
import type {
    CourseSeries,
    CourseSeriesListResponse,
    CreateCourseSeriesPayload,
    UpdateCourseSeriesPayload,
} from '../types/course-series.types';

// ─── Create ───────────────────────────────────────────────────────────────────

export const useCreateSeries = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (payload: CreateCourseSeriesPayload) => courseSeriesApi.createSeries(payload),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: COURSE_SERIES_QUERY_KEYS.lists() });
            toast.success(`Đã tạo series "${created.title}"`);
            navigate('/curriculum/series');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo series thất bại'));
        },
    });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const useUpdateSeries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ slug, payload }: { slug: string; payload: UpdateCourseSeriesPayload }) =>
            courseSeriesApi.updateSeries(slug, payload),
        onSuccess: (updated, variables) => {
            queryClient.invalidateQueries({ queryKey: COURSE_SERIES_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: COURSE_SERIES_QUERY_KEYS.detail(variables.slug) });
            toast.success(`Đã cập nhật series "${updated.title}"`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật series thất bại'));
        },
    });
};

// ─── Toggle status (with optimistic update) ──────────────────────────────────

export const useToggleSeriesStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (slug: string) => courseSeriesApi.toggleStatus(slug),

        onMutate: async (slug) => {
            // Cancel any outgoing refetches to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: COURSE_SERIES_QUERY_KEYS.lists() });

            // Snapshot for rollback
            const previousLists = queryClient.getQueriesData<CourseSeriesListResponse>({
                queryKey: COURSE_SERIES_QUERY_KEYS.lists(),
            });

            // Optimistically flip isActive
            queryClient.setQueriesData<CourseSeriesListResponse>(
                { queryKey: COURSE_SERIES_QUERY_KEYS.lists() },
                (old) =>
                    old
                        ? {
                              ...old,
                              data: old.data.map((s: CourseSeries) =>
                                  s.slug === slug ? { ...s, isActive: !s.isActive } : s,
                              ),
                          }
                        : old,
            );

            return { previousLists };
        },

        onError: (error, _, context) => {
            // Rollback to snapshot
            for (const [key, data] of context?.previousLists ?? []) {
                queryClient.setQueryData(key, data);
            }
            toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: COURSE_SERIES_QUERY_KEYS.lists() });
        },
    });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

// ─── Delete ───────────────────────────────────────────────────────────────────

export const useDeleteSeries = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (slug: string) => courseSeriesApi.deleteSeries(slug),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COURSE_SERIES_QUERY_KEYS.lists() });
            toast.success('Đã xóa series thành công');
            navigate('/curriculum/series');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Xóa series thất bại'));
        },
    });
};
