import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { LanguageOption } from '../types/language';

export const getLanguages = async (): Promise<LanguageOption[]> => {
    return apiGetUnwrappedEnvelope<LanguageOption[]>('/curriculum/languages', {
        params: {
            isActive: true,
        },
    });
};
