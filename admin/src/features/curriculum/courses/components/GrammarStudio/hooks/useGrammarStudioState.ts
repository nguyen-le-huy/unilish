import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GrammarSection = 'story' | 'rules' | 'practice';

interface GrammarStudioState {
    activeSection: GrammarSection;
}

interface UseGrammarStudioStateReturn {
    activeSection: GrammarSection;
    setActiveSection: (section: GrammarSection) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useGrammarStudioState = (): UseGrammarStudioStateReturn => {
    const [state, setState] = useState<GrammarStudioState>({
        activeSection: 'story',
    });

    const setActiveSection = useCallback((section: GrammarSection) => {
        setState((prev) => ({ ...prev, activeSection: section }));
    }, []);

    return {
        activeSection: state.activeSection,
        setActiveSection,
    };
};
