import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { RecommendedSeriesDto } from '../types/recommend-course.types';

export const getRecommendations = async (): Promise<RecommendedSeriesDto[]> => {
    return apiGetUnwrappedEnvelope<RecommendedSeriesDto[]>('/v1/recommendations');
};
