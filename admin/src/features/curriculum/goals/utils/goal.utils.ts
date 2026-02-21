import type { IgnoredSkill } from '../types/learning-goal.types';

export const normalizeVietnamese = (value: string): string => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};

export const toSlug = (value: string): string => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
};

export const parseIgnoredSkills = (value: string): IgnoredSkill[] => {
    const dictionary: Record<string, IgnoredSkill> = {
        spelling: 'Chính tả',
        'chinh ta': 'Chính tả',
        'chính tả': 'Chính tả',
        punctuation: 'Dấu câu',
        'dau cau': 'Dấu câu',
        'dấu câu': 'Dấu câu',
        formality: 'Trang trọng',
        'trang trong': 'Trang trọng',
        'trang trọng': 'Trang trọng',
        pronunciation: 'Phát âm',
        'phat am': 'Phát âm',
        'phát âm': 'Phát âm',
    };

    const normalized = value
        .split(',')
        .map((skill) => normalizeVietnamese(skill))
        .filter(Boolean)
        .map((skill) => dictionary[skill])
        .filter((skill): skill is IgnoredSkill => Boolean(skill));

    return Array.from(new Set(normalized));
};
