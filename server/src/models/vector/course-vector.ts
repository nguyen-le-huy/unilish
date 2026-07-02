import type { RecordMetadata } from '@pinecone-database/pinecone';

export const COURSE_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CourseLevel = typeof COURSE_LEVELS[number];

export const COURSE_LEVEL_TO_NUMBER: Record<CourseLevel, number> = {
    A0: 0,
    A1: 1,
    A2: 2,
    B1: 3,
    B2: 4,
    C1: 5,
    C2: 6,
};

export const NUMBER_TO_COURSE_LEVEL: Record<number, CourseLevel> = {
    0: 'A0',
    1: 'A1',
    2: 'A2',
    3: 'B1',
    4: 'B2',
    5: 'C1',
    6: 'C2',
};

export interface CourseVectorMetadata extends RecordMetadata {
    languageId: string;
    learningGoalId: string;
    isActive: boolean;
    level: CourseLevel;
    levelNum: number;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl: string;
    totalUnits: number;
    aiSummary?: string;
    topics?: string[];
    skills?: string[];
    tags?: string[];
    audience?: 'beginner' | 'intermediate' | 'advanced' | 'all';
    useCase?: string;
    aiAnalyzedAt?: string;
}

export const parseCourseLevel = (level: string): CourseLevel | null => {
    const upper = level.toUpperCase();
    if (upper in COURSE_LEVEL_TO_NUMBER) {
        return upper as CourseLevel;
    }
    return null;
};

/**
 * Determine a recommended level range around a user's current level.
 * Fallback: A1-A2 for A0 users, exact match for others.
 */
export const getRecommendedLevels = (userLevel: string): CourseLevel[] => {
    const parsed = parseCourseLevel(userLevel);

    if (!parsed) {
        // A0 user → recommend A1, A2
        return ['A1', 'A2'];
    }

    const num = COURSE_LEVEL_TO_NUMBER[parsed];

    // Recommend exact level + one above (if exists)
    const levels: CourseLevel[] = [parsed];
    const nextNum = num + 1;
    if (nextNum <= 6) {
        const nextLevel = NUMBER_TO_COURSE_LEVEL[nextNum];
        if (nextLevel) {
            levels.push(nextLevel);
        }
    }

    return levels;
};
