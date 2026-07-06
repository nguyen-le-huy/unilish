import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { CourseCatalogFilters, CourseCatalogItem } from '../types/all-courses.types';

export const getAllCourses = async (
    filters: CourseCatalogFilters,
): Promise<CourseCatalogItem[]> => {
    const params = new URLSearchParams({
        isActive: 'true',
        limit: '100',
        sort: 'orderIndex',
        order: 'asc',
    });

    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.level) params.set('level', filters.level);
    if (filters.languageId) params.set('languageId', filters.languageId);
    if (filters.learningGoalId) params.set('learningGoalId', filters.learningGoalId);

    return apiGetUnwrappedEnvelope<CourseCatalogItem[]>(
        `/curriculum/courses?${params.toString()}`,
    );
};
