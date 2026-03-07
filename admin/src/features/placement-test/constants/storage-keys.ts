// ─── Storage Keys ─────────────────────────────────────────────────────────────
// Single source of truth for all localStorage key strings in the placement-test feature.

export const STORAGE_KEYS = {
    WIZARD_DRAFT: 'placement-test-wizard',
    MCQ_MODULE_DRAFT: (id: string) => `placement-test:module-draft:mcq:${id}`,
} as const;
