import { useState, useCallback } from 'react';
import type { VocabItem, VocabContent } from '../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabStudioState {
    selectedItemId: string | null;
    dirtyItems: Map<string, Partial<VocabItem>>;
}

interface UseVocabStudioStateReturn {
    selectedItemId: string | null;
    selectItem: (id: string) => void;
    updateItem: (itemId: string, field: keyof VocabItem, value: string) => void;
    applyDirtyToContent: (content: VocabContent) => VocabContent;
    hasDirtyItems: boolean;
    clearDirty: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useVocabStudioState = (): UseVocabStudioStateReturn => {
    const [state, setState] = useState<VocabStudioState>({
        selectedItemId: null,
        dirtyItems: new Map(),
    });

    const selectItem = useCallback((id: string) => {
        setState((prev) => ({ ...prev, selectedItemId: id }));
    }, []);

    const updateItem = useCallback((itemId: string, field: keyof VocabItem, value: string) => {
        setState((prev) => {
            const next = new Map(prev.dirtyItems);
            const existing = next.get(itemId) ?? {};
            next.set(itemId, { ...existing, [field]: value });
            return { ...prev, dirtyItems: next };
        });
    }, []);

    /**
     * Merges dirty edits on top of the server content before saving.
     */
    const applyDirtyToContent = useCallback(
        (content: VocabContent): VocabContent => {
            if (state.dirtyItems.size === 0) return content;

            return {
                ...content,
                items: content.items.map((item) => {
                    const dirty = state.dirtyItems.get(item.id);
                    return dirty ? { ...item, ...dirty } : item;
                }),
            };
        },
        [state.dirtyItems],
    );

    const clearDirty = useCallback(() => {
        setState((prev) => ({ ...prev, dirtyItems: new Map() }));
    }, []);

    return {
        selectedItemId: state.selectedItemId,
        selectItem,
        updateItem,
        applyDirtyToContent,
        hasDirtyItems: state.dirtyItems.size > 0,
        clearDirty,
    };
};
