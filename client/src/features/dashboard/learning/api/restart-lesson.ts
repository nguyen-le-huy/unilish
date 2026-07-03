import { apiPostUnwrappedEnvelope } from '@/lib/axios';

export interface RestartLessonResult {
    progressId: string;
    status: string;
    checkpointVersion: number;
}

export const restartLesson = async (lessonId: string): Promise<RestartLessonResult> => {
    return apiPostUnwrappedEnvelope<RestartLessonResult>(
        `/learning/lessons/${lessonId}/restart`,
        {},
    );
};
