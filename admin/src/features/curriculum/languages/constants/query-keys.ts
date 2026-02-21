import type { LanguageListQuery } from '../types/language.types';

export const LANGUAGE_QUERY_KEYS = {
    all: ['languages'] as const,
    lists: () => [...LANGUAGE_QUERY_KEYS.all, 'list'] as const,
    list: (query: LanguageListQuery) => [...LANGUAGE_QUERY_KEYS.lists(), query] as const,
    details: () => [...LANGUAGE_QUERY_KEYS.all, 'detail'] as const,
    detail: (code: string) => [...LANGUAGE_QUERY_KEYS.details(), code] as const,
};
