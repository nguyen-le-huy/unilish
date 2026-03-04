// ─── Enums ────────────────────────────────────────────────────────────────────

export type QuestionSource = 'placement_test' | 'course' | 'practice';
export const QuestionSource = {
    PLACEMENT: 'placement_test' as QuestionSource,
    COURSE: 'course' as QuestionSource,
    PRACTICE: 'practice' as QuestionSource,
} as const;

export type QuestionSkill = 'listening' | 'reading' | 'writing' | 'speaking' | 'grammar' | 'vocabulary';
export const QuestionSkill = {
    LISTENING: 'listening' as QuestionSkill,
    READING: 'reading' as QuestionSkill,
    WRITING: 'writing' as QuestionSkill,
    SPEAKING: 'speaking' as QuestionSkill,
    GRAMMAR: 'grammar' as QuestionSkill,
    VOCABULARY: 'vocabulary' as QuestionSkill,
} as const;

export type QuestionDifficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type QuestionStatus = 'draft' | 'in_review' | 'published' | 'archived';

/** Convenience type for BulkActionBar user actions (mapped to IBulkActionPayload before API call) */
export type BulkAction = 'publish' | 'archive' | 'delete';
export type QuestionType =
    | 'MULTIPLE_CHOICE'
    | 'FILL_IN_BLANK'
    | 'ERROR_CORRECTION'
    | 'TRUE_FALSE'
    | 'MATCHING'
    | 'PRONUNCIATION'
    | 'ESSAY';

// ─── Question Model ───────────────────────────────────────────────────────────

export interface IQuestionStem {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
}

/** Multiple choice option */
export interface IQuestionOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

/** Polymorphic content — varies by question type */
export interface IQuestionContentMC {
    options: IQuestionOption[];
}
export interface IQuestionContentFill {
    correctAnswers: string[];
}
export interface IQuestionContentEssay {
    rubric: string;
    sampleAnswer?: string;
}

export interface IQuestion {
    _id: string;
    languageId: string;
    testedConcept: string;

    // CMS fields
    source: QuestionSource;
    skill: QuestionSkill;
    part?: number;
    difficulty: QuestionDifficulty;
    status: QuestionStatus;
    version: number;

    // Legacy numeric difficulty
    difficultyLevel: number;

    // Content
    type: QuestionType;
    stem: IQuestionStem;
    content: IQuestionContentMC | IQuestionContentFill | IQuestionContentEssay | Record<string, unknown>;
    explanation?: string;

    // Tags & audit
    tags: string[];
    createdBy?: string;
    reviewedBy?: string;

    // Analytics
    usageCount: number;
    avgCorrectRate?: number;

    createdAt: string;
    updatedAt: string;
}

// ─── List (Paginated) ─────────────────────────────────────────────────────────

export interface IPaginatedQuestions {
    data: IQuestion[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Filter / Query ───────────────────────────────────────────────────────────

export interface IQuestionFilters {
    page?: number;
    limit?: number;
    search?: string;
    languageId?: string;
    /** Array — serialised to comma-separated before API call */
    source?: QuestionSource[];
    /** Array — serialised to comma-separated before API call */
    skill?: QuestionSkill[];
    part?: number;
    /** Array — serialised to comma-separated before API call */
    difficulty?: QuestionDifficulty[];
    /** Array — serialised to comma-separated before API call */
    status?: QuestionStatus[];
    type?: QuestionType;
    /** Array — serialised to comma-separated before API call */
    tags?: string[];
    createdBy?: string;
    minCorrectRate?: number;
    maxCorrectRate?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'difficulty' | 'usageCount' | 'avgCorrectRate' | 'difficultyLevel';
    sortOrder?: 'asc' | 'desc';
}

// ─── Mutation Payloads ────────────────────────────────────────────────────────

/** Option shape used in form state (matches MC content options) */
export interface IFormOption {
    key: string;
    text: string;
    isCorrect: boolean;
}

export interface ICreateQuestionPayload {
    languageId: string;
    testedConcept: string;
    source: QuestionSource;
    skill: QuestionSkill;
    part?: number;
    difficulty: QuestionDifficulty;
    difficultyLevel: number;
    type: QuestionType;
    stem: IQuestionStem;
    /** For MC forms — mapped to content.options on submit */
    options: IFormOption[];
    /** Correct answer key (e.g. 'A') — mapped to content on submit */
    correctAnswer: string;
    content: Record<string, unknown>;
    explanation?: string;
    tags: string[];
    status?: QuestionStatus;
}

export type IUpdateQuestionPayload = Partial<
    Omit<ICreateQuestionPayload, 'languageId'>
>;

export interface IUpdateQuestionStatusPayload {
    status: QuestionStatus;
    reviewNote?: string;
}

export interface IBulkActionPayload {
    ids: string[];
    action: 'set_status' | 'add_tag' | 'remove_tag' | 'delete';
    payload?: {
        status?: QuestionStatus;
        tag?: string;
    };
}

export interface IBulkResult {
    affected: number;
    action: string;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
    draft: 'Nháp',
    in_review: 'Chờ duyệt',
    published: 'Đã xuất bản',
    archived: 'Lưu trữ',
};

export const QUESTION_STATUS_COLORS: Record<QuestionStatus, string> = {
    draft: 'secondary',
    in_review: 'outline',
    published: 'default',
    archived: 'destructive',
};

export const QUESTION_DIFFICULTY_COLORS: Record<QuestionDifficulty, string> = {
    A1: 'bg-green-100 text-green-800',
    A2: 'bg-emerald-100 text-emerald-800',
    B1: 'bg-blue-100 text-blue-800',
    B2: 'bg-indigo-100 text-indigo-800',
    C1: 'bg-orange-100 text-orange-800',
    C2: 'bg-red-100 text-red-800',
};

export const QUESTION_SKILL_LABELS: Record<QuestionSkill, string> = {
    listening: 'Nghe',
    reading: 'Đọc',
    writing: 'Viết',
    speaking: 'Nói',
    grammar: 'Ngữ pháp',
    vocabulary: 'Từ vựng',
};

export const QUESTION_SOURCE_LABELS: Record<QuestionSource, string> = {
    placement_test: 'Placement Test',
    course: 'Course',
    practice: 'Practice',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: 'Trắc nghiệm',
    FILL_IN_BLANK: 'Điền chỗ trống',
    ERROR_CORRECTION: 'Sửa lỗi',
    TRUE_FALSE: 'Đúng / Sai',
    MATCHING: 'Nối',
    PRONUNCIATION: 'Phát âm',
    ESSAY: 'Tự luận',
};
