import { useQuery } from '@tanstack/react-query';
import { languageApi } from '../api/language.api';
import { LANGUAGE_QUERY_KEYS } from '../constants/query-keys';
import type { LanguageListQuery } from '../types/language.types';

export const useLanguages = (query: LanguageListQuery = {}) => {
    return useQuery({
        queryKey: LANGUAGE_QUERY_KEYS.list(query),
        queryFn: () => languageApi.getLanguages(query),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useLanguageDetail = (code: string | undefined) => {
    return useQuery({
        queryKey: LANGUAGE_QUERY_KEYS.detail(code ?? 'new'),
        queryFn: () => languageApi.getLanguageByCode(code as string),
        enabled: Boolean(code && code !== 'new'),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};
