import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { languageApi } from '../api/language.api';
import { LANGUAGE_QUERY_KEYS } from '../constants/query-keys';
import type { CreateLanguagePayload, Language, UpdateLanguagePayload } from '../types/language.types';

export const useCreateLanguage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateLanguagePayload) => languageApi.createLanguage(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LANGUAGE_QUERY_KEYS.lists() });
            toast.success('Tạo ngôn ngữ thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo ngôn ngữ thất bại'));
        },
    });
};

export const useUpdateLanguage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ code, payload }: { code: string; payload: UpdateLanguagePayload }) =>
            languageApi.updateLanguage(code, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: LANGUAGE_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: LANGUAGE_QUERY_KEYS.detail(variables.code) });
            toast.success('Cập nhật ngôn ngữ thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật ngôn ngữ thất bại'));
        },
    });
};

export const useToggleLanguageStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (code: string) => languageApi.toggleStatus(code),
        onMutate: async (code) => {
            // Cancel in-flight refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: LANGUAGE_QUERY_KEYS.lists() });

            // Snapshot previous data for rollback
            const previousLists = queryClient.getQueriesData<Language[]>({
                queryKey: LANGUAGE_QUERY_KEYS.lists(),
            });

            // Optimistically flip the isActive flag
            queryClient.setQueriesData<Language[]>(
                { queryKey: LANGUAGE_QUERY_KEYS.lists() },
                (old) =>
                    old?.map((lang) =>
                        lang.code === code ? { ...lang, isActive: !lang.isActive } : lang,
                    ),
            );

            return { previousLists };
        },
        onError: (error, _, context) => {
            // Roll back to snapshot on failure
            if (context?.previousLists) {
                for (const [queryKey, data] of context.previousLists) {
                    queryClient.setQueryData(queryKey, data);
                }
            }
            toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
        },
        onSuccess: (_, code) => {
            queryClient.invalidateQueries({ queryKey: LANGUAGE_QUERY_KEYS.detail(code) });
            toast.success('Đã cập nhật trạng thái ngôn ngữ');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: LANGUAGE_QUERY_KEYS.lists() });
        },
    });
};

export const useTestLanguageVoice = () => {
    return useMutation({
        mutationFn: ({ code, payload }: { code: string; payload: Parameters<typeof languageApi.testVoice>[1] }) =>
            languageApi.testVoice(code, payload),
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Test voice thất bại'));
        },
    });
};

export const useUploadFlagIcon = () => {
    return useMutation({
        mutationFn: (file: File) => languageApi.uploadFlagIcon(file),
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Upload flag icon thất bại'));
        },
    });
};
