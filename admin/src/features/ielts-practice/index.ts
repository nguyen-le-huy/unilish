/* ──────────────────────────────────────────────────────────────
 * IELTS Practice Admin — Barrel exports
 * ────────────────────────────────────────────────────────────── */

export { default as IeltsPracticeListPage } from './pages/IeltsPracticeListPage';
export { default as IeltsPracticeEditorPage } from './pages/IeltsPracticeEditorPage';

export * from './types';

export { ieltsPracticeApi } from './api/ielts-practice.api';
export { IELTS_PRACTICE_QUERY_KEYS } from './constants/query-keys';
export {
  useIeltsPracticeTests,
  useIeltsPracticeTestDetail,
  useIeltsPracticeVersionHistory,
  useIeltsPracticeAnalytics,
} from './hooks/use-ielts-practice-tests';
export {
  useCreateIeltsPractice,
  useUpdateIeltsPractice,
  useCreateIeltsPracticeVersion,
  useUpdateIeltsPracticeStatus,
  useDeleteIeltsPractice,
  useRollbackIeltsPractice,
  useValidateIeltsPracticePublish,
} from './hooks/use-ielts-practice-mutations';
