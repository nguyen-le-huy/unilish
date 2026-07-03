import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type { LessonSubmissionKind, LessonQuestionFeedback } from '../types/learning.types';

export interface SubmissionPayload {
    clientAttemptId: string;
    submission: LessonSubmissionKind;
    durationSeconds: number;
}

export interface SubmissionResult {
    attemptId: string;
    score: number | null;
    passed: boolean;
    latestScore: number | null;
    bestScore: number | null;
    feedback: {
        summary: string | null;
        questions: LessonQuestionFeedback[];
    } | null;
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
