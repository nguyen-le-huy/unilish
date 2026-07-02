import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { LearnerLessonDto } from '../types/learning.types';

export const getLesson = async (lessonId: string): Promise<LearnerLessonDto> => {
    return apiGetUnwrappedEnvelope<LearnerLessonDto>(
        `/learning/lessons/${lessonId}`,
    );
};
