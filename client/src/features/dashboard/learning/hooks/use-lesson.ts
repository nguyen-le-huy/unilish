import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { getLesson } from '../api/get-lesson';
import { startLesson } from '../api/start-lesson';
import { restartLesson } from '../api/restart-lesson';
import { saveCheckpoint, type CheckpointPayload } from '../api/save-checkpoint';
import { submitLesson, type SubmissionPayload, type SubmissionResult } from '../api/submit-lesson';
import type { LearnerLessonDto } from '../types/learning.types';

const LESSON_QUERY_KEY = ['learning', 'lesson'] as const;

export const useLesson = (lessonId: string | undefined) => {
    return useQuery<LearnerLessonDto, AxiosError<ApiErrorResponse>>({
        queryKey: [...LESSON_QUERY_KEY, lessonId],
        queryFn: () => getLesson(lessonId!),
        enabled: !!lessonId,
        staleTime: 60 * 1000,
        retry: 1,
    });
};

export const useStartLesson = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lessonId: string) => startLesson(lessonId),
        onSuccess: () => {
            // The lesson payload is already loaded before this mutation runs.
            // Invalidating it here creates a GET -> start -> invalidate loop in
            // LessonPlayerPage and can leave the player showing its skeleton.
            queryClient.invalidateQueries({ queryKey: ['learning', 'dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['learning', 'roadmap'] });
        },
    });
};

export const useSaveCheckpoint = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ lessonId, payload }: { lessonId: string; payload: CheckpointPayload }) =>
            saveCheckpoint(lessonId, payload),
        onSuccess: (result, variables) => {
            queryClient.setQueryData<LearnerLessonDto>(
                [...LESSON_QUERY_KEY, variables.lessonId],
                (current) => current
                    ? {
                        ...current,
                        progress: {
                            ...current.progress,
                            checkpoint: variables.payload.checkpoint,
                            checkpointVersion: result.checkpointVersion,
                        },
                    }
                    : current,
            );
        },
    });
};

export const useSubmitLesson = () => {
    const queryClient = useQueryClient();

    return useMutation<SubmissionResult, AxiosError<ApiErrorResponse>, { lessonId: string; payload: SubmissionPayload }>({
        mutationFn: ({ lessonId, payload }) => submitLesson(lessonId, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...LESSON_QUERY_KEY, variables.lessonId] });
            queryClient.invalidateQueries({ queryKey: ['learning', 'dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['learning', 'roadmap'] });
        },
    });
};

export const useRestartLesson = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lessonId: string) => restartLesson(lessonId),
        onSuccess: (_, lessonId) => {
            queryClient.invalidateQueries({ queryKey: [...LESSON_QUERY_KEY, lessonId] });
            queryClient.invalidateQueries({ queryKey: ['learning', 'dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['learning', 'roadmap'] });
        },
    });
};
