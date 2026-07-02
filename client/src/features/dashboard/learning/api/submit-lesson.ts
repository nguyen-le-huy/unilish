import { apiPostUnwrappedEnvelope } from '@/lib/axios';

export interface SubmissionPayload {
    clientAttemptId: string;
    responses: Record<string, unknown>;
    durationSeconds: number;
}

export interface SubmissionResult {
    attemptId: string;
    score: number | null;
    passed: boolean;
    feedback: unknown;
    progress: {
        lessonStatus: 'IN_PROGRESS' | 'COMPLETED';
        unitStatus: string;
        courseStatus: 'ACTIVE' | 'COMPLETED';
        courseProgressPercent: number;
    };
    nextLessonId: string | null;
}

export const submitLesson = async (
    lessonId: string,
    payload: SubmissionPayload,
): Promise<SubmissionResult> => {
    return apiPostUnwrappedEnvelope<SubmissionResult, SubmissionPayload>(
        `/learning/lessons/${lessonId}/submit`,
        payload,
        {
            headers: { 'Idempotency-Key': payload.clientAttemptId },
        },
    );
};
