import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadingSection = 'text' | 'glossary';

interface ReadingStudioState {
    activeSection: ReadingSection;
}

interface UseReadingStudioStateReturn {
    activeSection: ReadingSection;
    setActiveSection: (section: ReadingSection) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useReadingStudioState = (): UseReadingStudioStateReturn => {
    const [state, setState] = useState<ReadingStudioState>({
        activeSection: 'text',
    });

    const setActiveSection = useCallback((section: ReadingSection) => {
        setState((prev) => ({ ...prev, activeSection: section }));
    }, []);

    return {
        activeSection: state.activeSection,
        setActiveSection,
    };
};
