import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { questionApi } from '../api/question.api';
import { QUESTION_QUERY_KEYS } from '../constants/query-keys';
import type { BulkAction, IBulkActionPayload } from '../types';

// Maps convenience BulkAction → raw IBulkActionPayload for the API
function toBulkPayload(ids: string[], action: BulkAction): IBulkActionPayload {
    switch (action) {
        case 'publish':
            return { ids, action: 'set_status', payload: { status: 'published' } };
        case 'archive':
            return { ids, action: 'set_status', payload: { status: 'archived' } };
        case 'delete':
            return { ids, action: 'delete' };
    }
}

export const useBulkAction = (onSuccess?: () => void) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: { ids: string[]; action: BulkAction }) =>
            questionApi.bulkAction(toBulkPayload(input.ids, input.action)),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: QUESTION_QUERY_KEYS.lists() });
            toast.success(`Đã thực hiện "${result.action}" cho ${result.affected} câu hỏi`);
            onSuccess?.();
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Bulk action thất bại'));
        },
    });
};

// ─── Export helper ─────────────────────────────────────────────────────────────

export const useExportQuestions = () => {
    return useMutation({
        mutationFn: ({
            filters,
            format,
        }: {
            filters: Parameters<typeof questionApi.export>[0];
            format?: 'csv' | 'json';
        }) => questionApi.export(filters, format),
        onSuccess: (blob, { format = 'csv' }) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questions-${Date.now()}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Xuất file thành công!');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Xuất file thất bại'));
        },
    });
};
