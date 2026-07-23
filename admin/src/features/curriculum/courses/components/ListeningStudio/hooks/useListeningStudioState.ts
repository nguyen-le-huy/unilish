import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListeningSection = 'script' | 'karaoke';

interface ListeningStudioState {
    activeSection: ListeningSection;
    isAiScriptModalOpen: boolean;
    isAiSyncOverlayOpen: boolean;
}

interface UseListeningStudioStateReturn {
    activeSection: ListeningSection;
    isAiScriptModalOpen: boolean;
    isAiSyncOverlayOpen: boolean;
    setActiveSection: (section: ListeningSection) => void;
    openAiScriptModal: () => void;
    closeAiScriptModal: () => void;
    openAiSyncOverlay: () => void;
    closeAiSyncOverlay: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useListeningStudioState = (): UseListeningStudioStateReturn => {
    const [state, setState] = useState<ListeningStudioState>({
        activeSection: 'script',
        isAiScriptModalOpen: false,
        isAiSyncOverlayOpen: false,
    });

    const setActiveSection = useCallback((section: ListeningSection) => {
        setState((prev) => ({ ...prev, activeSection: section }));
    }, []);

    const openAiScriptModal = useCallback(() => {
        setState((prev) => ({ ...prev, isAiScriptModalOpen: true }));
    }, []);

    const closeAiScriptModal = useCallback(() => {
        setState((prev) => ({ ...prev, isAiScriptModalOpen: false }));
    }, []);

    const openAiSyncOverlay = useCallback(() => {
        setState((prev) => ({ ...prev, isAiSyncOverlayOpen: true }));
    }, []);

    const closeAiSyncOverlay = useCallback(() => {
        setState((prev) => ({ ...prev, isAiSyncOverlayOpen: false }));
    }, []);

    return {
        activeSection: state.activeSection,
        isAiScriptModalOpen: state.isAiScriptModalOpen,
        isAiSyncOverlayOpen: state.isAiSyncOverlayOpen,
        setActiveSection,
        openAiScriptModal,
        closeAiScriptModal,
        openAiSyncOverlay,
        closeAiSyncOverlay,
    };
};
