// ─── Pages ────────────────────────────────────────────────────────────────────
export { default as PlacementTestListPage } from './pages/PlacementTestListPage/PlacementTestListPage';
export { default as PlacementTestWizardPage } from './pages/PlacementTestWizardPage/PlacementTestWizardPage';

// ─── Components ───────────────────────────────────────────────────────────────
export { StatusBadge } from './components/StatusBadge/StatusBadge';
export { PlacementTestTable } from './components/PlacementTestTable/PlacementTestTable';
export { VersionHistoryModal } from './components/VersionHistoryModal/VersionHistoryModal';
export { AnalyticsModal } from './components/AnalyticsModal/AnalyticsModal';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
    IPlacementTest,
    IPlacementTestSummary,
    IPaginatedPlacementTests,
    IPlacementTestFilters,
    ICreatePlacementTestPayload,
    IUpdatePlacementTestPayload,
    IUpdateStatusPayload,
    IPoolValidationResult,
    IVersionHistoryItem,
    IAnalyticsSummary,
    PlacementTestStatus,
    ModuleType,
    CEFRLevel,
    AiImportedQuestion,
} from './types';
export type { WizardFormState } from './types/wizard.types';

// ─── Constants ────────────────────────────────────────────────────────────────
export { PLACEMENT_STATUS_LABELS, CEFR_LEVELS, CEFR_LEVEL_LABELS, POOL_BUFFER_MULTIPLIER } from './constants';
export { STORAGE_KEYS } from './constants/storage-keys';
export { PLACEMENT_TEST_QUERY_KEYS } from './constants/query-keys';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { usePlacementTests } from './hooks/usePlacementTests';
export { usePlacementTest } from './hooks/usePlacementTest';
export {
    useCreatePlacementTest,
    useUpdatePlacementTest,
    useUpdatePlacementTestStatus,
    useRollbackPlacementTest,
} from './hooks/usePlacementTestMutations';
export { usePoolValidation, useVersionHistory, useAnalytics } from './hooks/usePlacementTestQueries';
