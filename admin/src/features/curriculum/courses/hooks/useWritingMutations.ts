import { useMutation, useQueryClient } from '@tanstack/react-query';
import { writingApi } from '../api/writing.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type {
    WritingContent,
    SaveWritingContentPayload,
    GenerateWritingMissionPayload,
    TestDriveGradePayload,
    TestDriveGradeResponse,
} from '../types/course.types';

export const useSaveWritingContent = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<WritingContent, Error, SaveWritingContentPayload>({
        mutationFn: (payload) => writingApi.saveContent(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.writingContent(lessonId), data);
        },
    });
};

export const useGenerateWritingMission = (lessonId: string) => {
    const queryClient = useQueryClient();

    return useMutation<WritingContent, Error, GenerateWritingMissionPayload>({
        mutationFn: (payload) => writingApi.generateMission(lessonId, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(LESSON_QUERY_KEYS.writingContent(lessonId), data);
        },
    });
};

export const useTestDriveGrade = (lessonId: string) => {
    return useMutation<TestDriveGradeResponse, Error, TestDriveGradePayload>({
        mutationFn: (payload) => writingApi.testDriveGrade(lessonId, payload),
    });
};
