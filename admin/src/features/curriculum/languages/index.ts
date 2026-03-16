// Public API — only import from here when consuming this feature outside its own boundary
export { default as LanguageListPage } from './pages/LanguageListPage/LanguageListPage';
export { default as LanguageEditorPage } from './pages/LanguageEditorPage/LanguageEditorPage';

// Cross-feature hooks (allowed via public barrel only — FSD §2)
export { useLanguages } from './hooks/useLanguages';
export { useUpdateLanguage } from './hooks/useLanguageMutations';
export type { Language } from './types/language.types';
