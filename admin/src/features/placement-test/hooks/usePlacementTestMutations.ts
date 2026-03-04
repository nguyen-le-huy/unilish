import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { placementTestApi } from '../api/placement-test.api';
import { PLACEMENT_TEST_QUERY_KEYS } from '../constants/query-keys';
import type {
    ICreatePlacementTestPayload,
    IUpdatePlacementTestPayload,
    IUpdateStatusPayload,
} from '../types';

// ─── Create ───────────────────────────────────────────────────────────────────

export const useCreatePlacementTest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ICreatePlacementTestPayload) =>
            placementTestApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PLACEMENT_TEST_QUERY_KEYS.lists() });
            toast.success('Tạo bài kiểm tra thành công!');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo bài kiểm tra thất bại'));
        },
    });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const useUpdatePlacementTest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: IUpdatePlacementTestPayload;
        }) => placementTestApi.update(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: PLACEMENT_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: PLACEMENT_TEST_QUERY_KEYS.detail(updated._id),
            });
            toast.success('Lưu nháp thành công!');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật bài kiểm tra thất bại'));
        },
    });
};

// ─── Update Status ────────────────────────────────────────────────────────────

export const useUpdatePlacementTestStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: IUpdateStatusPayload;
        }) => placementTestApi.updateStatus(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: PLACEMENT_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: PLACEMENT_TEST_QUERY_KEYS.detail(updated._id),
            });
            const statusLabel =
                updated.status === 'active'
                    ? 'Đã publish thành công!'
                    : updated.status === 'paused'
                      ? 'Đã tạm dừng bài thi'
                      : 'Đã lưu trữ bài thi';
            toast.success(statusLabel);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
        },
    });
};

// ─── Rollback ─────────────────────────────────────────────────────────────────

export const useRollbackPlacementTest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, version }: { id: string; version: number }) =>
            placementTestApi.rollback(id, version),
        onSuccess: (draft) => {
            queryClient.invalidateQueries({ queryKey: PLACEMENT_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: PLACEMENT_TEST_QUERY_KEYS.versions(draft._id),
            });
            toast.success(`Đã tạo draft rollback từ v${draft.version - 1}`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Rollback thất bại'));
        },
    });
};
