/**
 * BE-05: Learner-safe question fixtures for all 5 objective question types.
 *
 * These fixtures provide deterministic, learner-safe DTOs matching the
 * `LearnerPracticeQuestionDto` type. They contain NO answer-bearing fields
 * (isCorrect, correctAnswers, isTrue, matching mapping, correctText,
 * explanation) and are intended for FE renderer verification and BE contract
 * tests.
 *
 * Usage (FE):
 *   import { mcQuestion, fibQuestion, tfQuestion, matchQuestion, ecQuestion } from
 *     'server/test/fixtures/learner-questions.fixture';
 *
 * Each question includes realistic stem text (with optional audio/image URLs)
 * and type-specific fields.
 *
 * A full OBJECTIVE exercise fixture is also exported for end-to-end testing.
 */

// ─── Types (local mirror for importability) ─────────────────────────────────

export interface LearnerStemFixture {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
}

export interface MCQFixture {
    id: string;
    version: number;
    type: 'MULTIPLE_CHOICE';
    stem: LearnerStemFixture;
    options: Array<{ id: string; text: string }>;
}

export interface FIBFixture {
    id: string;
    version: number;
    type: 'FILL_IN_BLANK';
    stem: LearnerStemFixture;
}

export interface TFFixture {
    id: string;
    version: number;
    type: 'TRUE_FALSE';
    stem: LearnerStemFixture;
}

export interface MatchingFixture {
    id: string;
    version: number;
    type: 'MATCHING';
    stem: LearnerStemFixture;
    items: Array<{ id: string; text: string }>;
    targets: Array<{ id: string; text: string }>;
}

export interface ECFixture {
    id: string;
    version: number;
    type: 'ERROR_CORRECTION';
    stem: LearnerStemFixture & { text: string };
}

export type AnyLearnerQuestionFixture =
    | MCQFixture
    | FIBFixture
    | TFFixture
    | MatchingFixture
    | ECFixture;

export interface ObjectiveExerciseFixture {
    kind: 'OBJECTIVE';
    mode: 'FIXED';
    passingScore: number;
    questions: AnyLearnerQuestionFixture[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create a learner-safe audio URL (no provider credentials, no SAS token).
 */
export function safeAudioUrl(path: string): string {
    return `https://media.unilish.app/audio/${path}`;
}

/**
 * Create a learner-safe image URL (no provider credentials, no SAS token).
 */
export function safeImageUrl(path: string): string {
    return `https://media.unilish.app/images/${path}`;
}

// ─── MULTIPLE_CHOICE Fixtures ──────────────────────────────────────────────

/** MC with text-only stem and 4 options */
export const mcQuestion: MCQFixture = {
    id: '507f1f77bcf86cd799439011',
    version: 2,
    type: 'MULTIPLE_CHOICE',
    stem: { text: 'Choose the correct meaning of "luggage":' },
    options: [
        { id: 'mc-opt-a', text: 'Hành lý' },
        { id: 'mc-opt-b', text: 'Vé máy bay' },
        { id: 'mc-opt-c', text: 'Hộ chiếu' },
        { id: 'mc-opt-d', text: 'Sân bay' },
    ],
};

/** MC with audio stem — no credential in URL */
export const mcQuestionWithAudio: MCQFixture = {
    id: '507f1f77bcf86cd799439012',
    version: 1,
    type: 'MULTIPLE_CHOICE',
    stem: {
        text: 'Listen and choose the correct answer:',
        audioUrl: safeAudioUrl('listening/a1/dialog-01.mp3'),
    },
    options: [
        { id: 'mc-au-a', text: 'At the restaurant' },
        { id: 'mc-au-b', text: 'At the airport' },
        { id: 'mc-au-c', text: 'At the hotel' },
    ],
};

/** MC with image stem */
export const mcQuestionWithImage: MCQFixture = {
    id: '507f1f77bcf86cd799439013',
    version: 1,
    type: 'MULTIPLE_CHOICE',
    stem: {
        text: 'What is shown in the picture?',
        imageUrl: safeImageUrl('vocab/animals/cat.jpg'),
    },
    options: [
        { id: 'mc-img-a', text: 'A cat' },
        { id: 'mc-img-b', text: 'A dog' },
        { id: 'mc-img-c', text: 'A bird' },
    ],
};

// ─── FILL_IN_BLANK Fixtures ────────────────────────────────────────────────

/** FIB with text stem */
export const fibQuestion: FIBFixture = {
    id: '507f1f77bcf86cd799439014',
    version: 1,
    type: 'FILL_IN_BLANK',
    stem: {
        text: 'She ___ to school every day. (go/goes)',
    },
};

/** FIB with audio — listening gap-fill */
export const fibQuestionWithAudio: FIBFixture = {
    id: '507f1f77bcf86cd799439015',
    version: 2,
    type: 'FILL_IN_BLANK',
    stem: {
        text: 'Type the word you hear:',
        audioUrl: safeAudioUrl('gap-fill/a1/word-01.mp3'),
    },
};

// ─── TRUE_FALSE Fixtures ──────────────────────────────────────────────────

/** TF with text statement */
export const tfQuestion: TFFixture = {
    id: '507f1f77bcf86cd799439016',
    version: 1,
    type: 'TRUE_FALSE',
    stem: {
        text: 'The Earth is flat.',
    },
};

/** TF with audio — listening comprehension */
export const tfQuestionWithAudio: TFFixture = {
    id: '507f1f77bcf86cd799439017',
    version: 3,
    type: 'TRUE_FALSE',
    stem: {
        text: 'Is the statement in the audio true or false?',
        audioUrl: safeAudioUrl('listening/a1/dialog-02.mp3'),
    },
};

// ─── MATCHING Fixtures ────────────────────────────────────────────────────

/** Matching: match words with definitions */
export const matchQuestion: MatchingFixture = {
    id: '507f1f77bcf86cd799439018',
    version: 1,
    type: 'MATCHING',
    stem: {
        text: 'Match each word with its correct definition:',
    },
    items: [
        { id: 'match-item-1', text: 'Beautiful' },
        { id: 'match-item-2', text: 'Dangerous' },
        { id: 'match-item-3', text: 'Delicious' },
    ],
    targets: [
        { id: 'match-target-a', text: 'Very nice to look at' },
        { id: 'match-target-b', text: 'Tasting very good' },
        { id: 'match-target-c', text: 'Likely to cause harm' },
    ],
};

/** Matching with image stem */
export const matchQuestionWithImage: MatchingFixture = {
    id: '507f1f77bcf86cd799439019',
    version: 2,
    type: 'MATCHING',
    stem: {
        text: 'Match each item with its name:',
        imageUrl: safeImageUrl('vocab/kitchen/items.jpg'),
    },
    items: [
        { id: 'match-img-1', text: 'Item 1' },
        { id: 'match-img-2', text: 'Item 2' },
        { id: 'match-img-3', text: 'Item 3' },
    ],
    targets: [
        { id: 'match-img-a', text: 'Spoon' },
        { id: 'match-img-b', text: 'Fork' },
        { id: 'match-img-c', text: 'Knife' },
    ],
};

// ─── ERROR_CORRECTION Fixtures ────────────────────────────────────────────

/** EC with erroneous sentence in stem text */
export const ecQuestion: ECFixture = {
    id: '507f1f77bcf86cd799439020',
    version: 1,
    type: 'ERROR_CORRECTION',
    stem: {
        text: 'She go to school yesterday.',
    },
};

/** EC with audio — hear the error */
export const ecQuestionWithAudio: ECFixture = {
    id: '507f1f77bcf86cd799439021',
    version: 2,
    type: 'ERROR_CORRECTION',
    stem: {
        text: 'Listen and correct the sentence:',
        audioUrl: safeAudioUrl('correction/a1/error-01.mp3'),
    },
};

// ─── Full Exercise Fixture ────────────────────────────────────────────────

/**
 * A complete OBJECTIVE exercise containing one question of each type.
 * This mirrors the `exercise` field returned by GET /api/learning/lessons/:lessonId.
 */
export const fullObjectiveExercise: ObjectiveExerciseFixture = {
    kind: 'OBJECTIVE',
    mode: 'FIXED',
    passingScore: 80,
    questions: [
        mcQuestion,
        fibQuestion,
        tfQuestion,
        matchQuestion,
        ecQuestion,
    ],
};

/**
 * An exercise with audio/image media on every question.
 * Useful for testing media fallback and accessibility.
 */
export const mediaRichExercise: ObjectiveExerciseFixture = {
    kind: 'OBJECTIVE',
    mode: 'FIXED',
    passingScore: 60,
    questions: [
        mcQuestionWithAudio,
        fibQuestionWithAudio,
        tfQuestionWithAudio,
        matchQuestionWithImage,
        ecQuestionWithAudio,
    ],
};
