import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabApi } from '../api/vocab.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    VocabContent,
    GenerateVocabPayload,
    SaveVocabContentPayload,
    RegenerateAudioPayload,
} from '../types/course.types';

// ─── Save Vocab Content ───────────────────────────────────────────────────────

export const useSaveVocabContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<VocabContent, Error, SaveVocabContentPayload>({
        mutationFn: (payload) => vocabApi.saveVocabContent(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.vocabContent(lessonId), data);
        },
    });
};

// ─── Generate Vocab (AI) ──────────────────────────────────────────────────────

export const useGenerateVocab = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<VocabContent, Error, GenerateVocabPayload>({
        mutationFn: (payload) => vocabApi.generateVocab(lessonId, payload),
        onSuccess: (data) => {
            // Seed the content cache immediately with the initial response
            queryClient.setQueryData(LESSON_QUERY_KEYS.vocabContent(lessonId), data);
        },
    });
};

// ─── Regenerate Single Item Audio ─────────────────────────────────────────────

interface RegenerateAudioVars {
    itemId: string;
    payload: RegenerateAudioPayload;
}

export const useRegenerateAudio = (lessonId: string) => {
    return useMutation<void, Error, RegenerateAudioVars>({
        mutationFn: ({ itemId, payload }) => vocabApi.regenerateAudio(lessonId, itemId, payload),
    });
};

// ─── Generate All Audio ─────────────────────────────────────────────────────

export const useGenerateAllAudio = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, void>({
        mutationFn: () => vocabApi.generateAllAudio(lessonId),
        onSuccess: () => {
            // Invalidate status so polling picks up GENERATING_AUDIO immediately
            queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.vocabStatus(lessonId) });
        },
    });
};
