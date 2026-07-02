import { apiPostUnwrappedEnvelope } from '@/lib/axios';

export interface StartLessonResult {
    progressId: string;
    lessonId: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    checkpointVersion: number;
    startedAt: string;
    navigation: {
        previousLessonId: string | null;
        nextLessonId: string | null;
    };
}

export const startLesson = async (lessonId: string): Promise<StartLessonResult> => {
    return apiPostUnwrappedEnvelope<StartLessonResult>(
        `/learning/lessons/${lessonId}/start`,
        {},
        {
            headers: { 'Idempotency-Key': crypto.randomUUID() },
        },
    );
};
