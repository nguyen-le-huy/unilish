import type { SkillWeights } from '../types/learning-goal.types';

export type SkillKey = keyof SkillWeights;

export const SKILLS: Array<{ key: SkillKey; label: string }> = [
    { key: 'listening', label: 'Nghe' },
    { key: 'speaking', label: 'Nói' },
    { key: 'reading', label: 'Đọc' },
    { key: 'writing', label: 'Viết' },
    { key: 'grammar', label: 'Ngữ pháp' },
    { key: 'vocabulary', label: 'Từ vựng' },
];

export const DEFAULT_SKILL_WEIGHTS: SkillWeights = {
    listening: 0.25,
    speaking: 0.25,
    reading: 0.2,
    writing: 0.2,
    grammar: 0.05,
    vocabulary: 0.05,
};

export const SKILL_PRESETS: Record<string, SkillWeights> = {
    communication: {
        listening: 0.4,
        speaking: 0.4,
        reading: 0.08,
        writing: 0.06,
        grammar: 0.03,
        vocabulary: 0.03,
    },
    academic: {
        listening: 0.2,
        speaking: 0.15,
        reading: 0.3,
        writing: 0.3,
        grammar: 0.03,
        vocabulary: 0.02,
    },
    balanced: DEFAULT_SKILL_WEIGHTS,
};
