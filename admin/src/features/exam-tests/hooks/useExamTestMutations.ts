import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { examTestService } from '../api/examTestService';
import type {
    ICreateExamTestPayload,
    IUpdateExamStatusPayload,
    IUpdateExamTestPayload,
} from '../types';
import { EXAM_TEST_QUERY_KEYS } from './useExamTests';

interface UpdateExamTestArgs {
    id: string;
    payload: IUpdateExamTestPayload;
}

interface UpdateExamStatusArgs {
    id: string;
    payload: IUpdateExamStatusPayload;
}

interface RollbackExamTestArgs {
    id: string;
    version: number;
}

export const useCreateExamTest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ICreateExamTestPayload) => examTestService.create(payload),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: EXAM_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: EXAM_TEST_QUERY_KEYS.detail(created._id),
            });
            toast.success('Tạo bài thi thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo bài thi thất bại'));
        },
    });
};

export const useUpdateExamTest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: UpdateExamTestArgs) => examTestService.update(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: EXAM_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: EXAM_TEST_QUERY_KEYS.detail(updated._id),
            });
            toast.success('Cập nhật bài thi thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật bài thi thất bại'));
        },
    });
};

export const useUpdateExamTestStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: UpdateExamStatusArgs) => examTestService.updateStatus(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: EXAM_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: EXAM_TEST_QUERY_KEYS.detail(updated._id),
            });
            toast.success('Đã cập nhật trạng thái bài thi');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
        },
    });
};

export const useRollbackExamTest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, version }: RollbackExamTestArgs) => examTestService.rollback(id, version),
        onSuccess: (rolledBack) => {
            queryClient.invalidateQueries({ queryKey: EXAM_TEST_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({
                queryKey: EXAM_TEST_QUERY_KEYS.detail(rolledBack._id),
            });
            queryClient.invalidateQueries({
                queryKey: EXAM_TEST_QUERY_KEYS.versions(rolledBack._id),
            });
            toast.success(`Đã rollback về v${rolledBack.version}`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Rollback thất bại'));
        },
    });
};
