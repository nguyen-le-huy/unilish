import axiosInstance from '@/lib/axios';
import type {
    WritingContent,
    SaveWritingContentPayload,
    GenerateWritingMissionPayload,
    TestDriveGradePayload,
    TestDriveGradeResponse,
} from '../types/course.types';

export const writingApi = {
    getContent: async (lessonId: string): Promise<WritingContent> => {
        const { data } = await axiosInstance.get(`/curriculum/lessons/${lessonId}/writing/content`);
        return data.data;
    },

    saveContent: async (lessonId: string, payload: SaveWritingContentPayload): Promise<WritingContent> => {
        const { data } = await axiosInstance.put(`/curriculum/lessons/${lessonId}/writing/content`, payload);
        return data.data;
    },

    generateMission: async (lessonId: string, payload: GenerateWritingMissionPayload): Promise<WritingContent> => {
        const { data } = await axiosInstance.post(`/curriculum/lessons/${lessonId}/writing/generate-mission`, payload);
        return data.data;
    },

    testDriveGrade: async (lessonId: string, payload: TestDriveGradePayload): Promise<TestDriveGradeResponse> => {
        const { data } = await axiosInstance.post(`/curriculum/lessons/${lessonId}/writing/test-drive-grade`, payload);
        return data.data;
    },
};
