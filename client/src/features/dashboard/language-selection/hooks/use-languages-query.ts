import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { QUERY_KEY } from '../constants/language-selection.constants';
import { getLanguages } from '../api/get-languages';
import type { LanguageOption } from '../types/language';

export const useLanguagesQuery = () => {
    return useQuery<LanguageOption[], AxiosError<ApiErrorResponse>>({
        queryKey: QUERY_KEY,
        queryFn: getLanguages,
        staleTime: 5 * 60 * 1000,
    });
};
