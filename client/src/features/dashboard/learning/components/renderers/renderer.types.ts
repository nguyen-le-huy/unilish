// ─── Canonical learner-safe content DTOs (no answer-bearing fields) ──────────
// These map from the authored Admin content to learner-safe renderer props.

import type { LearnerLessonDto, LearnerExerciseDto, LearnerPracticeQuestionDto } from '../../types/learning.types';

// VOCAB
export interface LearnerVocabItem {
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
}

export interface LearnerVocabContent {
    type: 'VOCAB';
    scenario: string;
    items: LearnerVocabItem[];
}

// GRAMMAR
export interface LearnerGrammarExample {
    en: string;
    vi: string;
}

export interface LearnerGrammarHero {
    hook: string;
    contextSentences: string[];
}

export interface LearnerGrammarBlock {
    id: string;
    type: 'EXPLANATION' | 'CALLOUT' | 'UNIT_CONTEXT_BLOCK';
    heading?: string;
    body?: string;
    text?: string;
    note?: string;
    variant?: string;
    examples?: LearnerGrammarExample[];
    highlightPattern?: string;
}

export interface LearnerGrammarSummaryTable {
    columns: [string, string, string];
    rows: [string, string, string][];
}

export interface LearnerGrammarContent {
    type: 'GRAMMAR';
    conceptName: string;
    hero: LearnerGrammarHero;
    blocks: LearnerGrammarBlock[];
    summaryTable: LearnerGrammarSummaryTable;
    taughtConcepts: string[];
}

// READING
export interface LearnerReadingGlossaryItem {
    word: string;
    definition: string;
    type: string;
    ipa: string;
}

export interface LearnerReadingContent {
    type: 'READING';
    text: string;
    translation: string;
    glossary: Record<string, LearnerReadingGlossaryItem>;
    media: {
        audioUrl: string | null;
        durationSec: number;
    };
}

// LISTENING
export interface LearnerTranscriptWord {
    word: string;
    start: number;
    end: number;
    isTargetVocab: boolean;
}

export interface LearnerTranscriptLine {
    id: string;
    speaker: string;
    role: string;
    text: string;
    translation?: string;
    startTime: number;
    endTime: number;
    words: LearnerTranscriptWord[];
}

export interface LearnerListeningContent {
    type: 'LISTENING';
    media: {
        audioUrl: string | null;
        duration: number;
        accent: string;
    };
    transcript: LearnerTranscriptLine[];
    interactiveConfig: {
        mode: 'GAP_FILL' | 'SHADOWING';
        hidePercentage: number;
        allowSlowSpeed: boolean;
    };
}

// SPEAKING
export interface LearnerSpeakingHint {
    vi?: string;
    en?: string;
    structure?: string;
}

export interface LearnerSpeakingContent {
    type: 'SPEAKING';
    missionTitle: string;
    missionDescription: string;
    hints: LearnerSpeakingHint[];
}

// WRITING
export interface LearnerWritingContent {
    type: 'WRITING';
    prompt: string;
    promptTranslation: string;
    config: {
        minWords: number;
        maxWords: number;
        format: string;
        tone: string;
    };
    requiredConcepts: Array<{ keyword: string; points: number }>;
    requiredGrammar: string;
    sentenceStarters: string[];
    warmupTasks: Array<{
        id: string;
        type: 'UNSCRAMBLE';
        words: string[];
    }>;
    taughtConcepts: string[];
}

// UNIT_TEST
export interface LearnerUnitTestContent {
    type: 'UNIT_TEST';
    questions: Array<{
        id: string;
        stem?: string;
        type: string;
    }>;
}

export type LearnerContent =
    | LearnerVocabContent
    | LearnerGrammarContent
    | LearnerReadingContent
    | LearnerListeningContent
    | LearnerSpeakingContent
    | LearnerWritingContent
    | LearnerUnitTestContent;

// ─── Exercise adapter ─────────────────────────────────────────────────────────
// Maps from the Lesson DTO into structured renderer props.
// Do NOT infer exercise kind from `passingScore` alone (per FE-07 spec);
// always use the `exercise` DTO.

export interface ExerciseSectionProps {
    /** The exercise kind from the server DTO. */
    kind: LearnerExerciseDto['kind'];
    /** Where the exercise is in its lifecycle. */
    state: 'AVAILABLE' | 'UNAVAILABLE' | 'UNSUPPORTED';
    /**
     * Objective questions, populated only when kind === 'OBJECTIVE' and state === 'AVAILABLE'.
     * These are learner-safe (no answers/explanations).
     */
    questions?: LearnerPracticeQuestionDto[];
    /** Passing score for objective exercises. */
    passingScore?: number;
    /** Minimum word count for writing. */
    minWords?: number;
    /** Maximum word count for writing. */
    maxWords?: number;
}

/**
 * Adapter that takes the full LearnerLessonDto and returns renderer-friendly
 * content and exercise props. Handles unavailable/unsupported exercise states.
 */
export function adaptLessonToProps(lesson: LearnerLessonDto): {
    content: LearnerContent | null;
    exercise: ExerciseSectionProps | null;
} {
    const { exercise } = lesson.lesson;
    const content = lesson.lesson.content as LearnerContent | null;

    if (!exercise) {
        return { content, exercise: null };
    }

    switch (exercise.kind) {
        case 'OBJECTIVE': {
            // OBJECTIVE with no valid questions and UNIT_TEST → unavailable
            // OBJECTIVE with no valid questions and content Lesson → completion
            if (exercise.mode !== 'FIXED') {
                return {
                    content,
                    exercise: {
                        kind: 'OBJECTIVE',
                        state: 'UNSUPPORTED',
                    },
                };
            }

            if (exercise.questions.length === 0) {
                // For UNIT_TEST, no valid questions means unavailable
                // For other content Lessons, it means non-assessed completion
                // We let the content Lesson fall through to exercise-less rendering
                if (content?.type === 'UNIT_TEST') {
                    return {
                        content,
                        exercise: {
                            kind: 'OBJECTIVE',
                            state: 'UNAVAILABLE',
                        },
                    };
                }
                // Non-UNIT_TEST without questions → no practice needed
                return { content, exercise: null };
            }

            return {
                content,
                exercise: {
                    kind: 'OBJECTIVE',
                    state: 'AVAILABLE',
                    questions: exercise.questions,
                    passingScore: exercise.passingScore,
                },
            };
        }

        case 'SPEAKING':
            return {
                content,
                exercise: {
                    kind: 'SPEAKING',
                    state: 'AVAILABLE',
                },
            };

        case 'WRITING':
            return {
                content,
                exercise: {
                    kind: 'WRITING',
                    state: 'AVAILABLE',
                    minWords: exercise.minWords,
                    maxWords: exercise.maxWords,
                },
            };

        case 'COMPLETION':
            return {
                content,
                exercise: null, // No exercise section needed for explicit completion
            };

        default:
            return {
                content,
                exercise: {
                    kind: 'OBJECTIVE',
                    state: 'UNSUPPORTED',
                },
            };
    }
}
