import axiosInstance from '@/lib/axios';
import type {
    SpeakingContent,
    SaveSpeakingContentPayload,
    GenerateMissionPayload,
    RealtimeSessionBootstrap,
    TestSpeakingCoachPayload,
    TestSpeakingCoachResponse,
} from '../components/SpeakingStudio/types/speaking.types';

const normalizePayload = (payload: SaveSpeakingContentPayload): SaveSpeakingContentPayload => {
    const normalizedHints = payload.hints
        ?.map((hint) => ({
            vi: hint.vi?.trim() ?? '',
            en: hint.en?.trim() ?? '',
            structure: hint.structure?.trim() || undefined,
        }))
        .filter((hint) => hint.vi.length > 0 && hint.en.length > 0);

    const normalizedKeywordConceptMap = payload.gradingConfig?.keywordConceptMap
        ?.map((item) => ({
            word: item.word?.trim().toLowerCase() ?? '',
            conceptId: item.conceptId?.trim() ?? '',
        }))
        .filter((item) => item.word.length > 0 && item.conceptId.length > 0);

    const roleName = payload.aiConfig?.roleName?.trim() ?? '';
    const firstMessage = payload.aiConfig?.firstMessage?.trim() ?? '';
    const systemInstruction = payload.aiConfig?.systemInstruction?.trim() ?? '';
    const hasCompleteAiConfig =
        roleName.length > 0 && firstMessage.length > 0 && systemInstruction.length > 0;

    const missionTitle = payload.missionTitle?.trim() ?? '';
    const missionDescription = payload.missionDescription?.trim() ?? '';

    return {
        ...payload,
        missionTitle: missionTitle.length > 0 ? missionTitle : undefined,
        missionDescription: missionDescription.length > 0 ? missionDescription : undefined,
        aiConfig: payload.aiConfig && hasCompleteAiConfig
            ? {
                ...payload.aiConfig,
                roleName,
                firstMessage,
                systemInstruction,
            }
            : undefined,
        gradingConfig: payload.gradingConfig
            ? {
                ...payload.gradingConfig,
                referenceText: payload.gradingConfig.referenceText?.trim() ?? null,
                requiredKeywords: payload.gradingConfig.requiredKeywords
                    .map((keyword) => keyword.trim().toLowerCase())
                    .filter((keyword) => keyword.length > 0),
                keywordConceptMap: normalizedKeywordConceptMap ?? [],
            }
            : undefined,
        hints: normalizedHints ?? [],
    };
};

export const speakingApi = {
    getRealtimeSession: async (lessonId: string): Promise<RealtimeSessionBootstrap> => {
        const { data } = await axiosInstance.get(`/curriculum/lessons/${lessonId}/speaking/session`);
        return data.data;
    },

    getContent: async (lessonId: string): Promise<SpeakingContent> => {
        const { data } = await axiosInstance.get(`/curriculum/lessons/${lessonId}/speaking/content`);
        return data.data;
    },

    saveContent: async (
        lessonId: string,
        payload: SaveSpeakingContentPayload,
    ): Promise<SpeakingContent> => {
        const normalizedPayload = normalizePayload(payload);
        const { data } = await axiosInstance.put(
            `/curriculum/lessons/${lessonId}/speaking/content`,
            normalizedPayload,
        );
        return data.data;
    },

    generateMission: async (
        lessonId: string,
        payload: GenerateMissionPayload,
    ): Promise<SpeakingContent> => {
        const { data } = await axiosInstance.post(
            `/curriculum/lessons/${lessonId}/speaking/generate-mission`,
            payload,
        );
        return data.data;
    },

    testCoach: async (
        lessonId: string,
        payload: TestSpeakingCoachPayload,
    ): Promise<TestSpeakingCoachResponse> => {
        const { data } = await axiosInstance.post(
            `/curriculum/lessons/${lessonId}/speaking/test-coach`,
            payload,
        );
        return data.data;
    },
};
