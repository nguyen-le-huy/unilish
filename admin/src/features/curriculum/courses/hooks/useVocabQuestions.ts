import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import { vocabApi } from '../api/vocab.api';
import { lessonApi } from '../api/lesson.api';
import type { IQuestion, UpdateQuestionPayload } from '../types/course.types';

// ─── Query: Get Questions ─────────────────────────────────────────────────────

export const useLessonQuestions = (lessonId: string) =>
    useQuery<IQuestion[]>({
        queryKey: LESSON_QUERY_KEYS.vocabQuestions(lessonId),
        queryFn: () => vocabApi.getVocabQuestions(lessonId),
        enabled: !!lessonId,
        staleTime: 5 * 60 * 1000, // 5 min
    });

// ─── Mutation: Generate Questions ────────────────────────────────────────────

export const useGenerateVocabQuestions = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<IQuestion[], Error, { distribution: { mc: number; fill: number; match: number } }>({
        mutationFn: ({ distribution }) => vocabApi.generateVocabQuestions(lessonId, distribution),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.vocabQuestions(lessonId), data);
            // Invalidate lesson detail so practiceConfig.questionIds reflects updated list
            queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.detail(lessonId) });
        },
    });
};

// ─── Mutation: Swap Question ──────────────────────────────────────────────────

export const useSwapVocabQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<IQuestion, Error, { questionId: string }>({
        mutationFn: ({ questionId }) => vocabApi.swapVocabQuestion(lessonId, questionId),
        onSuccess: (replacement, { questionId }) => {
            // Optimistically replace the swapped question in cache
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.vocabQuestions(lessonId),
                (prev: IQuestion[] | undefined) =>
                    prev?.map((q) => (q._id === questionId ? replacement : q)) ?? [replacement],
            );
        },
    });
};

// ─── Mutation: Update Question ────────────────────────────────────────────────

export const useUpdateVocabQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<IQuestion, Error, { questionId: string; payload: UpdateQuestionPayload }>({
        mutationFn: ({ questionId, payload }) =>
            vocabApi.updateVocabQuestion(lessonId, questionId, payload),
        onSuccess: (updated) => {
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.vocabQuestions(lessonId),
                (prev: IQuestion[] | undefined) =>
                    prev?.map((q) => (q._id === updated._id ? updated : q)) ?? [updated],
            );
        },
    });
};

// ─── Mutation: Update Passing Score ──────────────────────────────────────────

export const useUpdatePassingScore = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<unknown, Error, { passingScore: number }>({
        mutationFn: ({ passingScore }) =>
            lessonApi.updateLesson(lessonId, { practiceConfig: { passingScore } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.detail(lessonId) });
        },
    });
};
