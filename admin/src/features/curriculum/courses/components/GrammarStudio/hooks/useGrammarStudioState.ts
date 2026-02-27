import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GrammarPanel = 'hero' | 'block' | 'summary' | 'practice';

interface GrammarStudioState {
    activePanel: GrammarPanel;
    activeBlockId: string | null;
}

interface UseGrammarStudioStateReturn {
    activePanel: GrammarPanel;
    activeBlockId: string | null;
    setHeroPanel: () => void;
    setSummaryPanel: () => void;
    setPracticePanel: () => void;
    setActiveBlock: (blockId: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useGrammarStudioState = (): UseGrammarStudioStateReturn => {
    const [state, setState] = useState<GrammarStudioState>({
        activePanel: 'hero',
        activeBlockId: null,
    });

    const setHeroPanel = useCallback(() => {
        setState((prev) => ({ ...prev, activePanel: 'hero', activeBlockId: null }));
    }, []);

    const setSummaryPanel = useCallback(() => {
        setState((prev) => ({ ...prev, activePanel: 'summary', activeBlockId: null }));
    }, []);

    const setPracticePanel = useCallback(() => {
        setState((prev) => ({ ...prev, activePanel: 'practice', activeBlockId: null }));
    }, []);

    const setActiveBlock = useCallback((blockId: string) => {
        setState((prev) => ({ ...prev, activePanel: 'block', activeBlockId: blockId }));
    }, []);

    return {
        activePanel: state.activePanel,
        activeBlockId: state.activeBlockId,
        setHeroPanel,
        setSummaryPanel,
        setPracticePanel,
        setActiveBlock,
    };
};
