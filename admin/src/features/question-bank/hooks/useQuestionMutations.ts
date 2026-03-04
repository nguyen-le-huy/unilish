import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { questionApi } from '../api/question.api';
import { QUESTION_QUERY_KEYS } from '../constants/query-keys';
import type {
    ICreateQuestionPayload,
    IUpdateQuestionPayload,
    IUpdateQuestionStatusPayload,
} from '../types';

// ─── Create ───────────────────────────────────────────────────────────────────

export const useCreateQuestion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ICreateQuestionPayload) => questionApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.lists() });
            toast.success('Tạo câu hỏi thành công!');
            // Navigation is caller's responsibility
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo câu hỏi thất bại'));
        },
    });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const useUpdateQuestion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateQuestionPayload }) =>
            questionApi.update(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.detail(updated._id) });
            toast.success('Cập nhật câu hỏi thành công!');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật câu hỏi thất bại'));
        },
    });
};

// ─── Update Status ────────────────────────────────────────────────────────────

export const useUpdateQuestionStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateQuestionStatusPayload }) =>
            questionApi.updateStatus(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.detail(updated._id) });
            toast.success('Cập nhật trạng thái thành công!');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
        },
    });
};

// ─── Delete (Optimistic) ──────────────────────────────────────────────────────

export const useDeleteQuestion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => questionApi.delete(id),
        onSuccess: (_, id) => {
            // Remove from all list caches immediately
            queryClient.removeQueries({ queryKey: QUESTION_QUERY_KEYS.detail(id) });
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.lists() });
            toast.success('Xóa câu hỏi thành công!');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Xóa câu hỏi thất bại'));
        },
    });
};
