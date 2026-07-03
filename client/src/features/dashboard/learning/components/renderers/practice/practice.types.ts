// ─── Learner-safe practice question types (no answer-bearing fields) ─────────
// These match the LearnerPracticeQuestionDto API contract exactly.
// `explanation` must NOT appear pre-submit (NFR-04).

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
    id: string;
    version: number;
    type: 'MULTIPLE_CHOICE';
    stem: LearnerQuestionStem;
    options: LearnerMCOption[];
}

export interface LearnerFillQuestion {
    id: string;
    version: number;
    type: 'FILL_IN_BLANK';
    stem: LearnerQuestionStem;
}

export interface LearnerMatchingQuestion {
    id: string;
    version: number;
    type: 'MATCHING';
    stem: LearnerQuestionStem;
    items: Array<{ id: string; text: string }>;
    targets: Array<{ id: string; text: string }>;
}

export interface LearnerTrueFalseQuestion {
    id: string;
    version: number;
    type: 'TRUE_FALSE';
    stem: LearnerQuestionStem;
}

export interface LearnerErrorCorrectionQuestion {
    id: string;
    version: number;
    type: 'ERROR_CORRECTION';
    stem: LearnerQuestionStem & { text: string };
}

export type LearnerPracticeQuestion =
    | LearnerMCQuestion
    | LearnerFillQuestion
    | LearnerMatchingQuestion
    | LearnerTrueFalseQuestion
    | LearnerErrorCorrectionQuestion;

// ─── Answer state for practice components ────────────────────────────────────

export interface MCQAnswer {
    selectedOptionId: string;
}

export interface FillAnswer {
    text: string;
}

export interface TFAnswer {
    value: boolean;
}

export interface MatchAnswer {
    pairs: Record<string, string>;
}

export interface ErrorCorrectionAnswer {
    text: string;
}

export type PracticeAnswer =
    | MCQAnswer
    | FillAnswer
    | TFAnswer
    | MatchAnswer
    | ErrorCorrectionAnswer;

// ─── Question feedback (post-submit only) ────────────────────────────────────

export interface QuestionFeedback {
    correct: boolean;
    learnerAnswer: unknown;
    correctAnswer: unknown;
    explanation: string | null;
}
