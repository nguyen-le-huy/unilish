import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PlacementModuleKey = 'lr' | 'writing' | 'speaking' | 'result';

export interface IModuleEssay {
    type: 'essay';
    timeLimitMinutes?: number;
    promptImageUrl?: string;
    aiModel?: string;
    topicsByLevel?: {
        low?: string[];
        mid?: string[];
        high?: string[];
    };
    wordLimits?: {
        low?: number;
        mid?: number;
        high?: number;
    };
}

export interface IModuleSpeaking {
    type: 'speaking';
    config?: {
        ttsModel?: string;
        ttsVoice?: string;
        gradingModel?: string;
        silenceThreshold?: number;
    };
    parts?: {
        part1?: {
            questions?: string[];
            questionsRange?: { min?: number; max?: number };
        };
        part2?: {
            topics?: string[];
            questionsRange?: { min?: number; max?: number };
        };
        part3?: {
            questions?: string[];
            questionsRange?: { min?: number; max?: number };
        };
    };
}

export interface ICEFRMappingSnapshot {
    weights?: {
        mcq?: number;
        writing?: number;
        speaking?: number;
    };
    thresholds?: Array<{
        level?: string;
        mcqMin?: number;
        mcqMax?: number;
        writingMin?: number;
        writingMax?: number;
        speakingMin?: number;
        speakingMax?: number;
    }>;
}

interface PlacementTestSessionState {
    sessionId: string | null;
    attemptId: string | null;
    writingAttemptId: string | null;
    speakingAttemptId: string | null;
    currentModule: PlacementModuleKey | null;
    lrRawScore: number | null;
    placementTestId: string | null;
    essayModule: IModuleEssay | null;
    speakingModule: IModuleSpeaking | null;
    cefrMapping: ICEFRMappingSnapshot | null;
    setTestConfig: (config: {
        placementTestId: string;
        essayModule: IModuleEssay;
        speakingModule: IModuleSpeaking;
        cefrMapping?: ICEFRMappingSnapshot;
    }) => void;
    setSessionId: (id: string) => void;
    setAttemptId: (id: string) => void;
    setLrRawScore: (score: number) => void;
    setCurrentModule: (module: PlacementModuleKey) => void;
    setWritingAttemptId: (id: string) => void;
    setSpeakingAttemptId: (id: string) => void;
    clear: () => void;
}

const initialState = {
    sessionId: null,
    attemptId: null,
    writingAttemptId: null,
    speakingAttemptId: null,
    currentModule: null,
    lrRawScore: null,
    placementTestId: null,
    essayModule: null,
    speakingModule: null,
    cefrMapping: null,
};

export const usePlacementTestStore = create<PlacementTestSessionState>()(
    persist(
        (set) => ({
            ...initialState,
            setTestConfig: (config) =>
                set({
                    placementTestId: config.placementTestId,
                    essayModule: config.essayModule,
                    speakingModule: config.speakingModule,
                    cefrMapping: config.cefrMapping ?? null,
                }),
            setSessionId: (id) => set({ sessionId: id }),
            setAttemptId: (id) => set({ attemptId: id }),
            setLrRawScore: (score) => set({ lrRawScore: score }),
            setCurrentModule: (module) => set({ currentModule: module }),
            setWritingAttemptId: (id) => set({ writingAttemptId: id }),
            setSpeakingAttemptId: (id) => set({ speakingAttemptId: id }),
            clear: () => set(initialState),
        }),
        {
            name: 'unilish-placement-test-session',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                sessionId: state.sessionId,
                attemptId: state.attemptId,
                writingAttemptId: state.writingAttemptId,
                speakingAttemptId: state.speakingAttemptId,
                currentModule: state.currentModule,
                lrRawScore: state.lrRawScore,
                placementTestId: state.placementTestId,
                essayModule: state.essayModule,
                speakingModule: state.speakingModule,
                cefrMapping: state.cefrMapping,
            }),
        },
    ),
);