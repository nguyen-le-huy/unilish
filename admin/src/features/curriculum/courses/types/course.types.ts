// ─── Enums ───────────────────────────────────────────────────────────────────

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const LESSON_TYPES = [
    'VOCAB',
    'GRAMMAR',
    'READING',
    'LISTENING',
    'SPEAKING',
    'WRITING',
    'UNIT_TEST',
] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const PRACTICE_MODES = ['FIXED', 'DYNAMIC'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface StructureMatrix {
    vocabCount?: number;
    grammarCount?: number;
    readingTaskCount?: number;
    listeningTaskCount?: number;
    writingTaskCount?: number;
    speakingTaskCount?: number;
}

export interface FinalExamConfig {
    durationMinutes: number;
    passScore: number;
    structureMatrix: StructureMatrix;
    questionPool: {
        readingLessonIds: string[];
        listeningLessonIds: string[];
    };
}

export interface ContextSeed {
    scenario?: string;
    keywords: string[];
    culturalNotes?: string;
}

export interface PracticeConfig {
    mode: PracticeMode;
    questionIds: string[];
    dynamicRules: {
        quantity: number;
        difficulty: number;
    };
    passingScore: number;
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Course {
    _id: string;
    seriesId: string;
    name: string;
    level: CEFRLevel;
    orderInSeries: number;
    totalUnits: number;
    isActive: boolean;
    prerequisiteCourseId?: string | null;
    finalExamConfig: FinalExamConfig;
    createdAt: string;
    updatedAt: string;
}

export interface Unit {
    _id: string;
    courseId: string;
    title: string;
    orderIndex: number;
    description?: string | null;
    thumbnailUrl?: string | null;
    contextSeed: ContextSeed;
    vectorId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LessonSummary {
    _id: string;
    unitId: string;
    title: string;
    type: LessonType;
    orderIndex: number;
    practiceConfig: Pick<PracticeConfig, 'mode' | 'passingScore'>;
    createdAt: string;
    updatedAt: string;
}

// ─── Tree DTOs (for Studio) ───────────────────────────────────────────────────

export interface UnitWithLessons extends Unit {
    lessons: LessonSummary[];
}

export interface CourseTreeDTO extends Course {
    units: UnitWithLessons[];
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface CreateCoursePayload {
    seriesId: string;
    name: string;
    level: CEFRLevel;
    orderInSeries: number;
    prerequisiteCourseId?: string | null;
    finalExamConfig?: Partial<FinalExamConfig>;
}

export interface UpdateCoursePayload {
    name?: string;
    level?: CEFRLevel;
    orderInSeries?: number;
    prerequisiteCourseId?: string | null;
    finalExamConfig?: Partial<FinalExamConfig>;
    isActive?: boolean;
}

export interface CreateUnitPayload {
    courseId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string | null;
    contextSeed?: Partial<ContextSeed>;
}

export interface UpdateUnitPayload {
    title?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    contextSeed?: Partial<ContextSeed>;
}

export interface CreateLessonPayload {
    unitId: string;
    title: string;
    type: LessonType;
    practiceConfig?: Partial<PracticeConfig>;
}

export interface UpdateLessonPayload {
    title?: string;
    type?: LessonType;
    practiceConfig?: Partial<PracticeConfig>;
}

export interface ReorderUnitsPayload {
    courseId: string;
    orderedIds: string[];
}

export interface ReorderLessonsPayload {
    unitId: string;
    orderedIds: string[];
}

// ─── Query filters ────────────────────────────────────────────────────────────

export interface CourseListQuery {
    seriesId: string;
    isActive?: boolean;
}

// ─── Vocab Content Types ──────────────────────────────────────────────────────

export type VocabGenerationStatus =
    | 'IDLE'
    | 'GENERATING'
    | 'GENERATING_AUDIO'
    | 'DONE'
    | 'ERROR';

export interface VocabItem {
    id: string;
    word: string;
    partOfSpeech: string;
    ipa: string;
    definitionNative: string;
    definitionEn: string;
    exampleSentence: string;
    exampleTranslation: string;
    audioWordUrl: string | null;
    audioSentenceUrl: string | null;
    imageUrl: string | null;
    conceptId: string | null;
}

export interface VocabContent {
    type: 'VOCAB';
    scenario: string;
    generationStatus: VocabGenerationStatus;
    items: VocabItem[];
}

export interface VocabStatusResponse {
    status: VocabGenerationStatus;
    itemCount: number;
}

// ─── Vocab Mutation Payloads ──────────────────────────────────────────────────

export interface GenerateVocabPayload {
    wordCount?: number;
    wordList?: string[];
}

export interface SaveVocabContentPayload {
    scenario: string;
    generationStatus: VocabGenerationStatus;
    items: VocabItem[];
}

export interface RegenerateAudioPayload {
    target: 'word' | 'sentence';
}

