import { useMutation, useQueryClient } from '@tanstack/react-query';
import { grammarApi } from '../api/grammar.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    GrammarContent,
    SaveGrammarContentPayload,
    GenerateGrammarStoryPayload,
    GenerateGrammarStoryResponse,
    GrammarQuestionsResponse,
    GrammarQuestionCard,
    UpdateGrammarQuestionPayload,
} from '../types/course.types';

// ─── Save Grammar Content ─────────────────────────────────────────────────────

export const useSaveGrammarContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<GrammarContent, Error, SaveGrammarContentPayload>({
        mutationFn: (payload) => grammarApi.saveContent(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.grammarContent(lessonId), data);
        },
    });
};

// ─── Generate Grammar Story (AI) ──────────────────────────────────────────────

export const useGenerateGrammarStory = (lessonId: string) => {
    return useMutation<GenerateGrammarStoryResponse, Error, GenerateGrammarStoryPayload>({
        mutationFn: (payload) => grammarApi.generateStory(lessonId, payload),
    });
};

// ─── Generate Grammar Questions ───────────────────────────────────────────────

export const useGenerateGrammarQuestions = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<GrammarQuestionsResponse, Error, { count?: number; types?: string[] }>({
        mutationFn: ({ count, types }) => grammarApi.generateQuestions(lessonId, count, types),
        onSuccess: (data) => {
            // ① Immediately update the grammarContent cache so questionIds → PracticeEditor
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.grammarContent(lessonId),
                (old: GrammarContent | undefined) =>
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
            // ② Fetch freshly-hydrated cards so Review Board renders
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.grammarQuestions(lessonId),
            });
        },
    });
};

// ─── Generate Grammar Audio ───────────────────────────────────────────────────

export const useGenerateGrammarAudio = (lessonId: string) => {
    return useMutation<void, Error, void>({
        mutationFn: () => grammarApi.generateAudio(lessonId),
    });
};
// ─── Swap a single question (regenerate from bank) ──────────────────────────

export const useSwapGrammarQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<GrammarQuestionCard, Error, string>({
        mutationFn: (questionId) => grammarApi.swapQuestion(lessonId, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.grammarQuestions(lessonId),
            });
        },
    });
};

// ─── Edit a single question ──────────────────────────────────────────────────────

export const useUpdateGrammarQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<
        GrammarQuestionCard,
        Error,
        { questionId: string; body: UpdateGrammarQuestionPayload }
    >({
        mutationFn: ({ questionId, body }) =>
            grammarApi.updateQuestion(lessonId, questionId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.grammarQuestions(lessonId),
            });
        },
    });
};

// ─── Delete a single question ────────────────────────────────────────────────────

export const useDeleteGrammarQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (questionId) => grammarApi.deleteQuestion(lessonId, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.grammarQuestions(lessonId),
            });
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.grammarContent(lessonId),
            });
        },
    });
};