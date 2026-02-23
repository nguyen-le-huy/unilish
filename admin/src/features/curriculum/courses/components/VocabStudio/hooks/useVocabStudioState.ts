import { useState, useCallback } from 'react';
import type { VocabItem, VocabContent } from '../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabStudioState {
    selectedItemId: string | null;
    /** Keyed by VocabItem.id — pending edits not yet persisted to the server. */
    dirtyItems: Record<string, Partial<VocabItem>>;
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
        dirtyItems: {},
    });

    const selectItem = useCallback((id: string) => {
        setState((prev) => ({ ...prev, selectedItemId: id }));
    }, []);

    const updateItem = useCallback((itemId: string, field: keyof VocabItem, value: string) => {
        setState((prev) => ({
            ...prev,
            dirtyItems: {
                ...prev.dirtyItems,
                [itemId]: { ...prev.dirtyItems[itemId], [field]: value },
            },
        }));
    }, []);

    /**
     * Merges dirty edits on top of the server content before saving.
     */
    const applyDirtyToContent = useCallback(
        (content: VocabContent): VocabContent => {
            if (Object.keys(state.dirtyItems).length === 0) return content;

            return {
                ...content,
                items: content.items.map((item) => {
                    const dirty = state.dirtyItems[item.id];
                    return dirty ? { ...item, ...dirty } : item;
                }),
            };
        },
        [state.dirtyItems],
    );

    const clearDirty = useCallback(() => {
        setState((prev) => ({ ...prev, dirtyItems: {} }));
    }, []);

    return {
        selectedItemId: state.selectedItemId,
        selectItem,
        updateItem,
        applyDirtyToContent,
        hasDirtyItems: Object.keys(state.dirtyItems).length > 0,
        clearDirty,
    };
};
