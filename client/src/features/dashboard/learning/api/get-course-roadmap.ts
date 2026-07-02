import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { CourseRoadmapDto } from '../types/learning.types';

export const getCourseRoadmap = async (slug: string): Promise<CourseRoadmapDto> => {
    return apiGetUnwrappedEnvelope<CourseRoadmapDto>(
        `/learning/courses/${encodeURIComponent(slug)}`,
    );
};
