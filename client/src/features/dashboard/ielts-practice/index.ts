/* ──────────────────────────────────────────────────────────────
 * IELTS Practice — Barrel exports
 * ────────────────────────────────────────────────────────────── */

// Pages
export { default as IeltsPracticePage } from './pages/IeltsPracticePage';
export { default as IeltsSkillPage } from './pages/IeltsSkillPage';
export { default as IeltsListeningTestPage } from './pages/IeltsListeningTestPage';
export { default as IeltsReadingTestPage } from './pages/IeltsReadingTestPage';
export { default as IeltsWritingTestPage } from './pages/IeltsWritingTestPage';
export { default as IeltsSpeakingTestPage } from './pages/IeltsSpeakingTestPage';
export { default as IeltsResultPage } from './pages/IeltsResultPage';

// Types
export * from './types/ielts-practice.types';

// Hooks
export { useIeltsSummary } from './hooks/use-ielts-summary';
export { useIeltsTests } from './hooks/use-ielts-tests';
export { useIeltsTestDetail } from './hooks/use-ielts-test-detail';
export {
  useAttempt,
  useAttemptResult,
  useStartAttempt,
  useSaveDraft,
  useSubmitAttempt,
  useAbandonAttempt,
} from './hooks/use-ielts-attempt';
export { useIeltsAttemptInit } from './hooks/use-ielts-attempt-init';
export { useIeltsPlayer } from './hooks/use-ielts-player';
export { useIeltsAutosave, getLocalRecovery, clearLocalRecovery } from './hooks/use-ielts-autosave';

// Components
export { default as ExamShell } from './components/ExamShell/ExamShell';
export { default as SaveStatus } from './components/SaveStatus/SaveStatus';
export { default as SubmitDialog } from './components/SubmitDialog/SubmitDialog';
export { default as ConflictDialog } from './components/ConflictDialog/ConflictDialog';

// Renderers
export { ListeningFormCompletion } from './components/renderers/ListeningFormCompletion';
export { ReadingTrueFalseNotGiven } from './components/renderers/ReadingTrueFalseNotGiven';
export { WritingTaskOneChart } from './components/renderers/WritingTaskOneChart';
export { SpeakingAiConversation } from './components/renderers/SpeakingAiConversation';

// API
export { IELTS_PRACTICE_KEYS } from './constants/query-keys';
