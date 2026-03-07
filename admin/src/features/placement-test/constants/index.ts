import type { CEFRLevel, PlacementTestStatus } from '../types';

// ─── Status Labels ────────────────────────────────────────────────────────────

export const PLACEMENT_STATUS_LABELS: Record<PlacementTestStatus, string> = {
    draft: 'Nháp',
    active: 'Hoạt động',
    paused: 'Tạm dừng',
    archived: 'Lưu trữ',
};

// ─── CEFR ─────────────────────────────────────────────────────────────────────

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_LEVEL_LABELS: Record<CEFRLevel, string> = {
    A1: 'A1 — Beginner',
    A2: 'A2 — Elementary',
    B1: 'B1 — Pre-Intermediate',
    B2: 'B2 — Intermediate',
    C1: 'C1 — Upper-Intermediate',
    C2: 'C2 — Advanced',
};

// ─── Language Standards ───────────────────────────────────────────────────────

export interface LanguageStandardSuggestion {
    standards: string[];
    output: string[];
}

export const LANGUAGE_STANDARD_SUGGESTIONS: Record<string, LanguageStandardSuggestion> = {
    en: { standards: ['TOEIC', 'IELTS', 'Hybrid'], output: ['CEFR'] },
    ja: { standards: ['TOEIC', 'IELTS', 'Hybrid'], output: ['CEFR', 'JF-Standard'] },
    ko: { standards: ['TOEIC', 'IELTS', 'Hybrid'], output: ['CEFR'] },
    zh: { standards: ['TOEIC', 'IELTS', 'Hybrid'], output: ['CEFR'] },
    fr: { standards: ['TOEIC', 'IELTS', 'Hybrid'], output: ['CEFR'] },
    es: { standards: ['TOEIC', 'IELTS', 'Hybrid'], output: ['CEFR'] },
};

// ─── TTS Voices ───────────────────────────────────────────────────────────────

export const TTS_VOICES = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (Expressive)' },
    { value: 'onyx', label: 'Onyx (Deep)' },
    { value: 'nova', label: 'Nova (Female)' },
    { value: 'shimmer', label: 'Shimmer (Soft)' },
] as const;

// ─── AI Models ────────────────────────────────────────────────────────────────

export const AI_MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
] as const;

// ─── IELTS Writing Criteria ───────────────────────────────────────────────────

export const ESSAY_CRITERIA_OPTIONS = [
    { value: 'TR', label: 'Task Response (TR)' },
    { value: 'CC', label: 'Coherence & Cohesion (CC)' },
    { value: 'LR', label: 'Lexical Resource (LR)' },
    { value: 'GRA', label: 'Grammatical Range & Accuracy (GRA)' },
];

// ─── Speaking Criteria ────────────────────────────────────────────────────────

export const SPEAKING_CRITERIA_OPTIONS = [
    { value: 'fluency', label: 'Fluency & Coherence' },
    { value: 'lexical', label: 'Lexical Resource' },
    { value: 'grammar', label: 'Grammatical Range' },
    { value: 'pronunciation', label: 'Pronunciation' },
];

// ─── Target Audience ─────────────────────────────────────────────────────────

export const TARGET_AUDIENCE_OPTIONS = [
    { value: 'new_user', label: 'User đăng ký mới (bắt buộc)' },
    { value: 'retake', label: 'User yêu cầu kiểm tra lại' },
    { value: 'invitation', label: 'Áp dụng theo invitation link' },
];

// ─── Output Frameworks ────────────────────────────────────────────────────────

export const OUTPUT_FRAMEWORK_OPTIONS = [
    { value: 'CEFR', label: 'CEFR (A1–C2)' },
    { value: 'JF-Standard', label: 'JF Standard (Japanese)' },
    { value: 'Custom', label: 'Tùy chỉnh' },
];

// ─── Pool Buffer Multiplier ───────────────────────────────────────────────────

/** Minimum pool size = questionsCount × POOL_BUFFER_MULTIPLIER */
export const POOL_BUFFER_MULTIPLIER = 2;
