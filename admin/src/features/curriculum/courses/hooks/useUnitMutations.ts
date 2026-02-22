import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { unitApi } from '../api/unit.api';
import { COURSE_QUERY_KEYS, UNIT_QUERY_KEYS } from '../constants/query-keys';
import type { CreateUnitPayload, ReorderUnitsPayload, UpdateUnitPayload } from '../types/course.types';

// ─── Create ───────────────────────────────────────────────────────────────────

export const useCreateUnit = (courseId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateUnitPayload) => unitApi.createUnit(payload),
        onSuccess: (created) => {
            // Invalidate both the unit list and the full tree
            queryClient.invalidateQueries({ queryKey: UNIT_QUERY_KEYS.list(courseId) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success(`Đã tạo unit "${created.title}"`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo unit thất bại'));
        },
    });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const useUpdateUnit = (courseId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateUnitPayload }) =>
            unitApi.updateUnit(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: UNIT_QUERY_KEYS.detail(updated._id) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success(`Đã cập nhật unit "${updated.title}"`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật unit thất bại'));
        },
    });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const useDeleteUnit = (courseId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (unitId: string) => unitApi.deleteUnit(unitId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: UNIT_QUERY_KEYS.list(courseId) });
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
            toast.success('Đã xóa unit và toàn bộ lesson bên trong');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Xóa unit thất bại'));
        },
    });
};

// ─── Reorder ─────────────────────────────────────────────────────────────────

export const useReorderUnits = (courseId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReorderUnitsPayload) => unitApi.reorderUnits(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.tree(courseId) });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Sắp xếp unit thất bại'));
        },
    });
};
