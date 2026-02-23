import { useMutation, useQueryClient } from '@tanstack/react-query';
import { readingApi } from '../api/reading.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    ReadingContent,
    SaveReadingContentPayload,
    ReadingGenerationPayload,
    ReadingQuestionsResponse,
    ReadingQuestionCard,
    UpdateReadingQuestionPayload,
} from '../types/course.types';

// ─── Save Reading Content ─────────────────────────────────────────────────────

export const useSaveReadingContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ReadingContent, Error, SaveReadingContentPayload>({
        mutationFn: (payload) => readingApi.saveContent(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.readingContent(lessonId), data);
        },
    });
};

// ─── AI: Generate Reading Passage + Glossary ──────────────────────────────────

export const useGenerateReadingContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<
        { text: string; translation: string; glossary: ReadingContent['glossary'] },
        Error,
        ReadingGenerationPayload
    >({
        mutationFn: (payload) => readingApi.generateContent(lessonId, payload),
        onSuccess: (data) => {
            // Optimistically merge generated content into the cache
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.readingContent(lessonId),
                (old: ReadingContent | undefined) =>
                    old
                        ? { ...old, text: data.text, translation: data.translation, glossary: data.glossary, generationStatus: 'DONE' }
                        : old,
            );
            // Invalidate questions since text changed
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.readingQuestions(lessonId),
            });
        },
    });
};

// ─── AI: Fill Glossary Definitions ───────────────────────────────────────────

export const useFillGlossary = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ReadingContent['glossary'], Error, void>({
        mutationFn: () => readingApi.fillGlossary(lessonId),
        onSuccess: (updatedGlossary) => {
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.readingContent(lessonId),
                (old: ReadingContent | undefined) =>
                    old ? { ...old, glossary: updatedGlossary } : old,
            );
        },
    });
};

// ─── Generate Reading Audio ───────────────────────────────────────────────────

export const useGenerateReadingAudio = (lessonId: string) => {
    return useMutation<void, Error, void>({
        mutationFn: () => readingApi.generateAudio(lessonId),
    });
};

// ─── Generate Reading Questions ───────────────────────────────────────────────

export const useGenerateReadingQuestions = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ReadingQuestionsResponse, Error, { count?: number; types?: string[] }>({
        mutationFn: ({ count, types }) => readingApi.generateQuestions(lessonId, count, types),
        onSuccess: (data) => {
            // Update practiceConfig.questionIds in the content cache
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.readingContent(lessonId),
                (old: ReadingContent | undefined) =>
                    old
                        ? {
                              ...old,
                              practiceConfig: {
                                  ...old.practiceConfig,
                                  questionIds: data.questionIds,
                              },
                          }
                        : old,
            );
            // Fetch freshly-hydrated cards for the practice board
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.readingQuestions(lessonId),
            });
        },
    });
};

// ─── Swap a Single Question ───────────────────────────────────────────────────

export const useSwapReadingQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ReadingQuestionCard, Error, string>({
        mutationFn: (questionId) => readingApi.swapQuestion(lessonId, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.readingQuestions(lessonId),
            });
        },
    });
};

// ─── Edit a Single Question ───────────────────────────────────────────────────

export const useUpdateReadingQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<
        ReadingQuestionCard,
        Error,
        { questionId: string; body: UpdateReadingQuestionPayload }
    >({
        mutationFn: ({ questionId, body }) =>
            readingApi.updateQuestion(lessonId, questionId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.readingQuestions(lessonId),
            });
        },
    });
};

// ─── Delete a Single Question ─────────────────────────────────────────────────

export const useDeleteReadingQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (questionId) => readingApi.deleteQuestion(lessonId, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.readingQuestions(lessonId),
            });
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.readingContent(lessonId),
            });
        },
    });
};
