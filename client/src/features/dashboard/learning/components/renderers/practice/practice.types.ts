// ─── Learner-safe practice question types (no answer-bearing fields) ─────────

export interface LearnerQuestionStem {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
}

export interface LearnerMCOption {
    id: string;
    text: string;
}

export interface LearnerMCQuestion {
    _id: string;
    type: 'MULTIPLE_CHOICE';
    stem: LearnerQuestionStem;
    options: LearnerMCOption[];
    explanation?: string;
}

export interface LearnerFillQuestion {
    _id: string;
    type: 'FILL_IN_BLANK';
    stem: LearnerQuestionStem;
    explanation?: string;
}

export interface LearnerMatchingQuestion {
    _id: string;
    type: 'MATCHING';
    stem: LearnerQuestionStem;
    items: Array<{ id: string; text: string }>;
    targets: Array<{ id: string; text: string }>;
    explanation?: string;
}

export interface LearnerTrueFalseQuestion {
    _id: string;
    type: 'TRUE_FALSE';
    stem: LearnerQuestionStem;
    explanation?: string;
}

export interface LearnerErrorCorrectionQuestion {
    _id: string;
    type: 'ERROR_CORRECTION';
    stem: LearnerQuestionStem & { text: string };
    explanation?: string;
}

export type LearnerPracticeQuestion =
    | LearnerMCQuestion
    | LearnerFillQuestion
    | LearnerMatchingQuestion
    | LearnerTrueFalseQuestion
    | LearnerErrorCorrectionQuestion;

// ─── Response types (what the learner submits) ───────────────────────────────

export type QuestionResponse = Record<string, unknown>;
