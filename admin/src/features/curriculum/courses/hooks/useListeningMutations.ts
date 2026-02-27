import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listeningApi } from '../api/listening.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    ListeningContent,
    SaveListeningContentPayload,
    GenerateListeningScriptPayload,
    MixAndSyncPayload,
    TranscriptLine,
    SyncStatusResponse,
    ListeningQuestionsResponse,
    ListeningQuestionCard,
    UpdateListeningQuestionPayload,
    GenerateListeningQuestionsPayload,
} from '../types/course.types';

// ─── Save Listening Content ───────────────────────────────────────────────────

export const useSaveListeningContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ListeningContent, Error, SaveListeningContentPayload>({
        mutationFn: (payload) => listeningApi.saveContent(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.listeningContent(lessonId), data);
        },
    });
};

// ─── AI: Generate Script (Phase 3 — called by TopBar) ────────────────────────

export const useGenerateListeningScript = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<TranscriptLine[], Error, GenerateListeningScriptPayload>({
        mutationFn: (payload) => listeningApi.generateScript(lessonId, payload),
        onSuccess: (transcript) => {
            // Patch only the transcript in the cache; do not overwrite media/config
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.listeningContent(lessonId),
                (old: ListeningContent | undefined) =>
                    old
                        ? { ...old, transcript, generationStatus: 'IDLE' as const }
                        : old,
            );
        },
    });
};

// ─── AI: Mix & Sync — enqueues BullMQ job (Phase 3) ──────────────────────────

export const useMixAndSync = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<{ jobId: string }, Error, MixAndSyncPayload>({
        mutationFn: (payload) => listeningApi.mixAndSync(lessonId, payload),
        onSuccess: () => {
            // Mark status as SYNCING so UI shows loading overlay
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.listeningContent(lessonId),
                (old: ListeningContent | undefined) =>
                    old ? { ...old, generationStatus: 'SYNCING' as const } : old,
            );
        },
    });
};

// ─── AI: Cancel Mix & Sync ────────────────────────────────────────────────────

export const useCancelMixAndSync = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, void>({
        mutationFn: () => listeningApi.cancelMixAndSync(lessonId),
        onSuccess: () => {
            // Reset cache status to IDLE so overlay closes and buttons re-enable
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.listeningContent(lessonId),
                (old: ListeningContent | undefined) =>
                    old ? { ...old, generationStatus: 'IDLE' as const } : old,
            );
        },
    });
};

// ─── Sync Status Polling (for Mix & Sync progress display) ───────────────────

export const useListeningSyncStatus = (lessonId: string, enabled: boolean) => {
    const queryClient = useQueryClient();

    const query = useQuery<SyncStatusResponse>({
        queryKey: LESSON_QUERY_KEYS.listeningSyncStatus(lessonId),
        queryFn: () => listeningApi.getSyncStatus(lessonId),
        enabled: enabled && !!lessonId,
        refetchInterval: (q) => {
            const status = q.state.data?.status;
            if (status === 'DONE' || status === 'ERROR' || status === 'IDLE') return false;
            return 3000;
        },
    });

    useEffect(() => {
        const statusData = query.data;
        if (!statusData) return;

        queryClient.setQueryData(
            LESSON_QUERY_KEYS.listeningContent(lessonId),
            (old: ListeningContent | undefined) =>
                old
                    ? {
                        ...old,
                        generationStatus: statusData.status as ListeningContent['generationStatus'],
                        media: statusData.result
                            ? {
                                ...old.media,
                                audioUrl: statusData.result.audioUrl,
                                duration: statusData.result.duration,
                            }
                            : old.media,
                        transcript: statusData.result?.transcript ?? old.transcript,
                    }
                    : old,
        );

        if (statusData.status === 'DONE' || statusData.status === 'ERROR' || statusData.status === 'IDLE') {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.listeningContent(lessonId),
            });
        }
    }, [query.data, lessonId, queryClient]);

    return query;
};

// ─── Generate Listening Questions ────────────────────────────────────────────

export const useGenerateListeningQuestions = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ListeningQuestionsResponse, Error, GenerateListeningQuestionsPayload>({
        mutationFn: (payload) => listeningApi.generateQuestions(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(
                LESSON_QUERY_KEYS.listeningContent(lessonId),
                (old: ListeningContent | undefined) =>
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

            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.listeningQuestions(lessonId),
            });
        },
    });
};

export const useSwapListeningQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<ListeningQuestionCard, Error, string>({
        mutationFn: (questionId) => listeningApi.swapQuestion(lessonId, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.listeningQuestions(lessonId),
            });
        },
    });
};

export const useUpdateListeningQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<
        ListeningQuestionCard,
        Error,
        { questionId: string; body: UpdateListeningQuestionPayload }
    >({
        mutationFn: ({ questionId, body }) =>
            listeningApi.updateQuestion(lessonId, questionId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.listeningQuestions(lessonId),
            });
        },
    });
};

export const useDeleteListeningQuestion = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (questionId) => listeningApi.deleteQuestion(lessonId, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.listeningQuestions(lessonId),
            });
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.listeningContent(lessonId),
            });
        },
    });
};
