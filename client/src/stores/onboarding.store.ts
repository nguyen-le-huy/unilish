import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingDraftState {
    languageCode: string | null;
    languageId: string | null;
    learningGoal: string | null;
    setLanguage: (languageCode: string, languageId: string) => void;
    setLearningGoal: (learningGoal: string) => void;
    clear: () => void;
}

export const useOnboardingDraftStore = create<OnboardingDraftState>()(
    persist(
        (set) => ({
            languageCode: null,
            languageId: null,
            learningGoal: null,
            setLanguage: (languageCode, languageId) => set({ languageCode, languageId }),
            setLearningGoal: (learningGoal) => set({ learningGoal }),
            clear: () =>
                set({
                    languageCode: null,
                    languageId: null,
                    learningGoal: null,
                }),
        }),
        {
            name: 'unilish-onboarding-draft',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                languageCode: state.languageCode,
                languageId: state.languageId,
                learningGoal: state.learningGoal,
            }),
        },
    ),
);
