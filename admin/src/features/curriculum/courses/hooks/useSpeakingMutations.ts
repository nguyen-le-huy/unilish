import { useMutation, useQueryClient } from '@tanstack/react-query';
import { speakingApi } from '../api/speaking.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    SpeakingContent,
    SaveSpeakingContentPayload,
    GenerateMissionPayload,
    TestSpeakingCoachPayload,
    TestSpeakingCoachResponse,
} from '../components/SpeakingStudio/types/speaking.types';

export const useSaveSpeakingContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<SpeakingContent, Error, SaveSpeakingContentPayload>({
        mutationFn: (payload) => speakingApi.saveContent(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.speakingContent(lessonId), data);
        },
    });
};

export const useGenerateSpeakingMission = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<SpeakingContent, Error, GenerateMissionPayload>({
        mutationFn: (payload) => speakingApi.generateMission(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.speakingContent(lessonId), data);
        },
    });
};

export const useTestSpeakingCoach = (lessonId: string) => {
    return useMutation<TestSpeakingCoachResponse, Error, TestSpeakingCoachPayload>({
        mutationFn: (payload) => speakingApi.testCoach(lessonId, payload),
    });
};
