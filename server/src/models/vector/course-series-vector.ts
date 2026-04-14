import type { RecordMetadata } from '@pinecone-database/pinecone';

export const COURSE_SERIES_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CourseSeriesLevel = typeof COURSE_SERIES_LEVELS[number];

export const COURSE_SERIES_LEVEL_TO_NUMBER: Record<CourseSeriesLevel, number> = {
    A0: 0,
    A1: 1,
    A2: 2,
    B1: 3,
    B2: 4,
    C1: 5,
    C2: 6,
};

export interface CourseSeriesLevelRange {
    levelMin: CourseSeriesLevel;
    levelMax: CourseSeriesLevel;
    levelMinNum: number;
    levelMaxNum: number;
}

export interface CourseSeriesVectorMetadata extends RecordMetadata {
    languageId: string;
    learningGoalId: string;
    isActive: boolean;
    levelMinNum: number;
    levelMaxNum: number;
    levelMin: CourseSeriesLevel;
    levelMax: CourseSeriesLevel;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl: string;
    totalCourses: number;
    aiSummary?: string;
    topics?: string[];
    skills?: string[];
    tags?: string[];
    audience?: 'beginner' | 'intermediate' | 'advanced' | 'all';
    useCase?: string;
    aiAnalyzedAt?: string;
}

const CEFR_LEVEL_REGEX = /\b(A0|A1|A2|B1|B2|C1|C2)\b/gi;

const isCourseSeriesLevel = (value: string): value is CourseSeriesLevel => {
    return value in COURSE_SERIES_LEVEL_TO_NUMBER;
};

export const parseCourseSeriesLevelRange = (title: string): CourseSeriesLevelRange => {
    const matches = title.toUpperCase().match(CEFR_LEVEL_REGEX) ?? [];
    const levels = Array.from(new Set(matches)).filter(isCourseSeriesLevel);

    if (levels.length === 0) {
        return {
            levelMin: 'A0',
            levelMax: 'C2',
            levelMinNum: COURSE_SERIES_LEVEL_TO_NUMBER.A0,
            levelMaxNum: COURSE_SERIES_LEVEL_TO_NUMBER.C2,
        };
    }

    const sortedLevels = [...levels].sort(
        (a, b) => COURSE_SERIES_LEVEL_TO_NUMBER[a] - COURSE_SERIES_LEVEL_TO_NUMBER[b],
    );

    const levelMin = sortedLevels[0] ?? 'A0';
    const levelMax = sortedLevels[sortedLevels.length - 1] ?? 'C2';

    return {
        levelMin,
        levelMax,
        levelMinNum: COURSE_SERIES_LEVEL_TO_NUMBER[levelMin],
        levelMaxNum: COURSE_SERIES_LEVEL_TO_NUMBER[levelMax],
    };
};
