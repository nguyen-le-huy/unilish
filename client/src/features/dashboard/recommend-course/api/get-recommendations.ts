import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { RecommendedCourseDto } from '../types/recommend-course.types';

export const getRecommendations = async (): Promise<RecommendedCourseDto[]> => {
    return apiGetUnwrappedEnvelope<RecommendedCourseDto[]>('/v1/recommendations');
};
