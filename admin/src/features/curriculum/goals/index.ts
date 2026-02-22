// Public API — only import from here when consuming this feature outside its own boundary
export { default as GoalListPage } from './pages/GoalListPage/GoalListPage';
export { default as GoalEditorPage } from './pages/GoalEditorPage/GoalEditorPage';

// Cross-feature hooks (allowed via public barrel only — FSD §2)
export { useLearningGoals } from './hooks/useLearningGoals';
export type { LearningGoal } from './types/learning-goal.types';
