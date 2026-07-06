import { apiPostUnwrappedEnvelope } from '@/lib/axios';

export interface CompleteLessonResult {
    lessonStatus: 'COMPLETED';
    unitStatus: string;
    courseStatus: string;
    courseProgressPercent: number;
    nextLessonId: string | null;
}

export const completeLesson = async (lessonId: string): Promise<CompleteLessonResult> => {
    return apiPostUnwrappedEnvelope<CompleteLessonResult>(
        `/learning/lessons/${lessonId}/complete`,
        {},
    );
};
