import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StudioNodeType = 'course' | 'unit' | 'lesson';

export interface SelectedNode {
    type: StudioNodeType;
    id: string;
}

interface CourseStudioState {
    /** The course currently loaded in the Studio */
    activeCourseId: string | null;
    /** The node highlighted/selected in the Curriculum Tree */
    selectedNode: SelectedNode | null;

    setActiveCourseId: (id: string | null) => void;
    setSelectedNode: (node: SelectedNode | null) => void;
    reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCourseStudioStore = create<CourseStudioState>((set) => ({
    activeCourseId: null,
    selectedNode: null,

    setActiveCourseId: (id) => set({ activeCourseId: id, selectedNode: id ? { type: 'course', id } : null }),
    setSelectedNode: (node) => set({ selectedNode: node }),
    reset: () => set({ activeCourseId: null, selectedNode: null }),
}));
